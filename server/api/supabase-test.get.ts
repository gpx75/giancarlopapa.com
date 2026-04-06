export default defineEventHandler(async () => {
  const db = useSupabaseServer();
  const { data, error } = await db.from('test').select('*');
  if (error) return { connected: false, error: error.message };
  return { connected: true, rows: data };
});
