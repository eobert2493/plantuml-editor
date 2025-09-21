import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFile, deleteFile, duplicateFile, ensureDefault, getFile, listFiles, updateFileContent } from './fileStore';

// Clear DB between tests by deleting the database
async function resetDb() {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('plantuml-files-db');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('fileStore', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(async () => {
    await resetDb();
  });

  it('creates and lists files', async () => {
    const f = await createFile('A.puml', '@startuml\n@enduml');
    expect(f.id).toBeTypeOf('string');
    const list = await listFiles();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('A.puml');
  });

  it('updates content and size', async () => {
    const f = await createFile('A.puml', 'x');
    await updateFileContent(f.id, 'xyz');
    const got = await getFile(f.id);
    expect(got?.content).toBe('xyz');
    expect(got?.size).toBe(3);
  });

  it('duplicates files', async () => {
    const f = await createFile('A.puml', 'abc');
    const copy = await duplicateFile(f.id);
    expect(copy?.id).not.toBe(f.id);
    expect(copy?.content).toBe('abc');
  });

  it('ensureDefault returns existing on second call', async () => {
    const first = await ensureDefault('init');
    const second = await ensureDefault('ignored');
    expect(first.id).toBe(second.id);
  });

  it('deletes files', async () => {
    const f = await createFile('A.puml', 'abc');
    await deleteFile(f.id);
    const got = await getFile(f.id);
    expect(got).toBeNull();
  });
});


