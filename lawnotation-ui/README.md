# Lawnotation

## Stack

- Nuxt 3 (Vue 3) for the front- and back-end
- Supabase for authentication and database
- TRPC to link the front- and back-end

## Development

### 0. Prerequisite

The project assumes you have the following installed on your system for development:

- Docker
- pnpm

Additionally, for testing:

- Cypress required packages:
  - https://docs.cypress.io/guides/getting-started/installing-cypress#System-requirements

### 1. Install the required packages

```
pnpm install
```

### 2. Start the local supabase enviroment to get the relevant details

```
pnpm exec supabase start
```

### 3. Setup the .env file

First, copy the `.env.example` to `.env`

```
cp .env.example .env
```

Next, fill in the values.

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

### Manual testing

1. Open http://localhost:3000/
2. On the login page, fill in editor@test.com or annotator@test.com
3. Find the login mail by running:

```
pnpm supabase-mail
```
