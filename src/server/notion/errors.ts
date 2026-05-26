export class NotionConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotionConfigError"
  }
}

export class NotionQueryError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = "NotionQueryError"
  }
}

export class NotionMappingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotionMappingError"
  }
}

export class NotionContentError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "NotionContentError"
  }
}
