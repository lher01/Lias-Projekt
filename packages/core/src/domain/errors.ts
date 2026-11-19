/** Basis aller fachlichen Fehler. `code` ist stabil und für UI/Übersetzungen gedacht. */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message, "validation");
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" wurde nicht gefunden`, "not_found");
  }
}
