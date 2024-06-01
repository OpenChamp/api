# Guide

## Installing

Make sure you have bun installed. If you dont, install it from your package manager or from [The official website](https://bun.sh/)

Make sure you have mariadb or mysql installed to.

## When you have everything installed

```
$ bun install
```

## Set up the database and jwt secrets.

Fill out a .env file in the project root, looking like this:

```env
## Example config
JWT_SECRET=GoodKey1234
db_host=127.0.0.1
db_user=tester
db_password=tester1234
db_name=openchamp
```

Now run the command:

```
$ bun run drizzle:generate
```

## Run the dev server

```
$ bun run dev
```

DONE!

# Stuff generated when creating repo, DONT FOLLOW!

# Elysia with Bun runtime

## Getting Started

To get started with this template, simply paste this command into your terminal:

```bash
bun create elysia ./elysia-example
```

## Development

To start the development server run:

```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.
