import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { middleware, publicProcedure, router } from "~/server/trpc";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchGetItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { DocFormat, Doc } from "~/types/archive";

const config = useRuntimeConfig();

const client = new DynamoDBClient({
  region: config.public.awsRegion,
});

const archiveAuthorizer = middleware((opts) => {
  // opts.ctx.hooksKey
  return opts.next();
});

export const archiveRouter = router({
  // getXMLFromRechtspraak: publicProcedure
  //   .input(z.object({ eclis: z.array(z.string())}))
  //   // .use(archiveAuthorizer)
  //   .query(async ({ ctx, input }) => {

  //     try {
  //       const response = await fetch(`${config.public.mlBackendURL}/archives/search/rechtspraak/`, {
  //         method: "POST",
  //         body: JSON.stringify(input)
  //       });

  //       const xmls = await response.json();
  //       return xmls as string[];

  //     } catch (error) {
  //       throw new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: `Error in archive.getXMLFromRechtspraak: ${error.message}`,
  //       });
  //     }
  //   }),

  getFullTextFromRechtspraakDynamoDB: publicProcedure
    .input(z.object({ eclis: z.array(z.string()) }))
    // .use(archiveAuthorizer)
    .query(async ({ ctx, input }) => {
      try {
        const request_parameters = {
          RequestItems: {
            [config.public.awsRechtspraakTableName]: {
              Keys: input.eclis.map((x) => {
                return { ecli: { S: x }, ItemType: { S: "DATA" } };
              }),
              ProjectionExpression: "ecli, full_text"
            },
          },
        };

        const data = await client.send(
          new BatchGetItemCommand(request_parameters)
        );

        if (data.Responses) {
          return Object.entries(
            data.Responses[config.public.awsRechtspraakTableName]
          ).map((x) => {
            return {
              name: x[1]["ecli"]["S"] + ".txt",
              content: x[1]["full_text"]["S"],
              format: "text/plain",
            };
          }) as Doc[];
        } else {
          return [];
        }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in archive.getFullTextFromRechtspraak: ${error.message}`,
        });
      }
    }),

  getFullTextFromECHRDynamoDB: publicProcedure
    .input(z.object({ eclis: z.array(z.string()) }))
    // .use(archiveAuthorizer)
    .query(async ({ ctx, input }) => {
      try {
        const request_parameters = {
          RequestItems: {
            [config.public.awsECHRTableName]: {
              Keys: input.eclis.map((x) => {
                return { ECLI: { S: x }, ItemType: { S: "DATA" } };
              }),
            },
          },
        };

        const data = await client.send(
          new BatchGetItemCommand(request_parameters)
        );

        console.log(data);
        return data.Responses[config.public.awsECHRTableName];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error in archive.getFullTextFromECHR: ${error.message}`,
        });
      }
    }),
});

export type ArchiveRouter = typeof archiveRouter;
