-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "roles";

-- CreateEnum
CREATE TYPE "roles"."AppRole" AS ENUM ('editor', 'viewer');

-- CreateTable
CREATE TABLE "roles"."Assignment" (
    "userId" TEXT NOT NULL,
    "role" "roles"."AppRole" NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "roles"."Note" (
    "id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);
