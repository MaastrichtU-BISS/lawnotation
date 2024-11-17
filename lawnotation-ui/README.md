# Lawnotation

## Stack

- Nuxt 3 (Vue 3) for the front- and back-end
- Supabase for authentication and database
- TRPC to link the front- and back-end

## Development

### 0. Prerequisite

The project assumes you have the following installed on your system for development:

- The docker engine running
- [pnpm](https://pnpm.io/)
- Node JS equal or higher than 18.12


The project assumes you also have the following external dependencies:
- Supabase
- Mailtrap

Additionally, for testing:

- Cypress required packages:
  - https://docs.cypress.io/guides/getting-started/installing-cypress#System-requirements

### 1. Install the required packages

Make sure you run these commands in the folder containing this file, `./lawnotation-ui`

```
pnpm install
```

### 2. Start the local supabase enviroment to get the relevant details

```
pnpm exec supabase start
```

### 3. Setup the .env file

Copy the `.env.example` to a new `.env` file

```
cp .env.example .env
```

Fill in this information with the remote database

#### Supabase

For the supabase environment variables, copy the values from Supabase settings -> API:

- `SUPABASE_URL`: `Project URL`
- `SUPABASE_KEY`: `anon`
- `SUPABASE_SERVICE_KEY`: `service_role`

### 4. Run the services

#### 4.1 Supabase

Supabase should still be running in the background from the previous command (step 2). You can check this by executing:

```
pnpm exec supabase status
```

#### 4.2 Mailtrap

Copy the API Token from the Mailtrap in the `.env` file

```
MAILTRAP_TOKEN="<Your Mailtrap token>"
```

#### 4.2 Nuxt

You can start the nuxt instance using:

```
pnpm dev
```

## Testing

### Automated testing using Cypress

```
pnpm cypress
```

Pro tip: use a different browser than your default to test. E.g. test with Firefox if your default is Chrome. This helps to also cover browser dependant bugs.

### Access the local application for manual testing

1. Open http://localhost:3000/
2. On the login page, fill in editor@example.com or annotator@example.com
3. Find the login mail by running:

```
pnpm supabase-mail
```
