import { describe, expect, it } from "vitest"

import { splitSqlStatements } from "../../../lib/utils/sql"

describe("splitSqlStatements", () => {
  it("splits simple statements, trims whitespace, and ignores empty chunks", () => {
    expect(splitSqlStatements("  select 1;  \n\nselect 2;;  ")).toEqual([
      "select 1",
      "select 2",
    ])
  })

  it("does not split on semicolons inside quoted strings, identifiers, or comments", () => {
    const statements = splitSqlStatements(`
      insert into logs(message) values ('created; still same statement');
      -- a semicolon in a line comment; should stay with the next statement
      select "column;name" from logs;
      /* block comments can also contain ; */
      update logs set message = 'done';
    `)

    expect(statements).toHaveLength(3)
    expect(statements[0]).toBe(
      "insert into logs(message) values ('created; still same statement')",
    )
    expect(statements[1]).toContain("-- a semicolon in a line comment;")
    expect(statements[1]).toContain('select "column;name" from logs')
    expect(statements[2]).toContain("/* block comments can also contain ; */")
    expect(statements[2]).toContain("update logs set message = 'done'")
  })

  it("keeps dollar-quoted function bodies intact", () => {
    const statements = splitSqlStatements(`
      create function notify_user() returns trigger as $body$
      begin
        raise notice 'new value; %', new.id;
        return new;
      end;
      $body$ language plpgsql;

      select notify_user();
    `)

    expect(statements).toHaveLength(2)
    expect(statements[0]).toContain("raise notice 'new value; %'")
    expect(statements[0]).toContain("$body$ language plpgsql")
    expect(statements[1]).toBe("select notify_user()")
  })
})
