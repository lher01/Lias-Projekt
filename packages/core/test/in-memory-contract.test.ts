import { InMemoryEntryRepository, InMemoryProjectRepository } from "../src";
import { describeRepositoryContract } from "../src/testing/repository-contract";

describeRepositoryContract("In-Memory", async () => ({
  entries: new InMemoryEntryRepository(),
  projects: new InMemoryProjectRepository(),
}));
