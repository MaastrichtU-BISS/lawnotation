# Lawnotation

![Lawnotation](https://www.lawnotation.org/assets/lawnotation_logo_v2-17f3df90.svg)

Lawnotation is a legal text annotation platform for researchers, legal practioners and more.
Some of the most significant features are: assignment allocation, annotation metrics, discovery of published annotation tasks.

## Features
- PDF, HTML and TXT documents,
- Annotator allocation strategies,
- Advanced annotation insights and metrics,
- JSON import- and export,
- Publishing data,
- Document discovery.

## Quick Start
The easiest and quickest way to get started using Lawnotation is to use the hosted version of the platform. You can sign up for free at [lawnotation.org](lawnotation.org). 
After first sign-in, hints guide you through the application. Refer to the [documentation](https://docs.lawnotation.org/) if additional help is needed.

## Self-hosting

> [!NOTE]
> We're planning to create an easier self-hosting method only using Docker in the future.

It is also possible to install the platform on your own infrastructure. 
There are some dependencies that have to be resolved in some way or another. Some of these can be self-hosted as well, while others are exclusively external. For this section, use all services externally.

### Prerequisites and dependencies

- **pnpm** (or npm) for installing the required node packages,
- **Docker** for running the Supabase suite locally
- **Supabase** project
  - [Supabase](https://github.com/supabase/supabase) is an open source Firebase alternative. It is being used for interacting with a Postgres database and provides authentication to the users.
  - It is possible to run a Supabase locally, or to create a free project on supabase.com and use those details for self-hosting.
- **SMTP** credentials
  - In order to send OTP-emails and emails for when a user is assigned to a new task, it is needed to define SMTP credentials for sending these mails.

### Steps
**1. Clone the repository set up the directory**
```
git clone https://github.com/MaastrichtU-BISS/lawnotation.git
cd lawnotation-ui
pnpm install
```

**2. Create a project on supabase.com**
- Go to supabase.com, create an account and a project,
- In the project on the left sidebar, go to database,
- Copy the details for step 4

**3. Set-up the .env file**
- First, copy the `.env.example` file to `.env`
- Fill in the correct values:
  - `SUPABASE_URL`: The url for supabase
  - `SUPABASE_KEY`: Supabase anon key
  - `SUPABASE_SERVICE_KEY`: Supabase service key
  - `DATABASE_URL`: Postgres database URL
  - `SMTP_URL`: The connection URL to the SMTP server, starting with `smtp://` or `smtps://`. Go [here](https://www.nodemailer.com/smtp/) for an example

**4. Set-up the supabase database**
- Link the local instance to your remote supabase project using `pnpm supabase link` ([reference](https://supabase.com/docs/guides/functions/deploy))
- Push the migrations to the remote database using `pnpm supabase db push` command ([reference](https://supabase.com/docs/reference/cli/supabase-db-push))

**5. Start the nuxt server**
- The application can be built using `pnpm build`. 
- The application can be ran either using `pnpm preview` or `node .output/server/index.mjs`

## Development
The setup for developing is equivalent to that of self-hosting. The main difference is that Supabase is ran locally instead of remote, and that Nuxt's development server is started instead of its production server. To do this:

1. If you're on windows, make sure Docker is running by opening Docker Desktop once.
2. Run the supabase local development environment \
   `pnpm supabase start`
      - For details, refer to supabase's [local development guide](https://supabase.com/docs/guides/local-development)
3. Update the values of `.env` the values in the output of the above commands
4. Launch the nuxt development server \
   `pnpm dev`
