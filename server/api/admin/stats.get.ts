export default defineEventHandler(async () => {
  const db = useSupabaseServer();

  const { data, error } = await db
    .from('contact_submissions')
    .select('status');

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  const total = data.length;
  const newLeads = data.filter(r => r.status === 'new').length;
  const responded = data.filter(r => r.status === 'responded').length;

  return { total, new: newLeads, responded };
});
