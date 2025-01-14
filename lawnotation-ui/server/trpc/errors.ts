import { TRPCError } from "@trpc/server"

export const TRPCForbidden = () => {
  return new TRPCError({
    code: 'FORBIDDEN',
    message: "Sorry, the content you are looking for is not available.",
  })
}

export const TRPCNotFound = () => {
  return new TRPCError({
    code: 'NOT_FOUND',
    message: "Sorry, the content you are looking for is not available.",
  })
}