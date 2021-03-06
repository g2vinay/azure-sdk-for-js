// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TableServiceClient, TableClient } from "@azure/data-tables";

// Load the .env file if it exists
import * as dotenv from "dotenv";
dotenv.config();

const sasConnectionString = process.env["SAS_CONNECTION_STRING"] || "";

export async function createAndDeleteTable() {
  console.log("== Delete and create table Sample ==");

  // See authenticationMethods sample for other options of creating a new client
  const serviceClient = TableServiceClient.fromConnectionString(
    sasConnectionString
  );

  // Create a new table
  const tableName = "SampleCreateAndDeleteTable";
  await serviceClient.createTable(tableName);

  // Deletes the table
  await serviceClient.deleteTable(tableName);
}

export async function createAndDeleteTableWithTableClient() {
  // A table can also be created and deleted using a TableClient
  console.log("== Delete and create table with TableClient Sample ==");

  const tableName = "SampleCreateAndDeleteTable2";

  // Creating a new table client doesn't do a network call
  const client = TableClient.fromConnectionString(
    sasConnectionString,
    tableName
  );

  // Will attempt to create a table with the tableName specified above
  await client.create();

  // Will attempt to delete the table with the tableName specified above
  await client.delete();
}

export async function main() {
  await createAndDeleteTable();
  await createAndDeleteTableWithTableClient();
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});
