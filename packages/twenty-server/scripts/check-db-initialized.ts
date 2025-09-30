import { rawDataSource } from 'src/database/typeorm/raw/raw.datasource';

async function checkDatabaseInitialized(): Promise<boolean> {
  try {
    await rawDataSource.initialize();

    // Check if the core schema and workspace table exist
    const result = await rawDataSource.query(
      `SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'core' 
        AND table_name = 'workspace'
      ) as exists`,
    );

    await rawDataSource.destroy();

    return result[0]?.exists === true;
  } catch (error) {
    // If we can't connect or query, assume database is not initialized
    return false;
  }
}

checkDatabaseInitialized()
  .then((isInitialized) => {
    process.exit(isInitialized ? 0 : 1);
  })
  .catch(() => {
    process.exit(1);
  });
