// Gallery trip metadata plus all its stages, shared by the trip index and the stage pages.
export async function useGallery(trip: string) {
  const { data } = await useAsyncData(`gallery-${trip}`, async () => {
    const [meta, stages] = await Promise.all([
      queryCollection('galleryTrips').where('slug', '=', trip).first(),
      queryCollection('galleryStages').where('trip', '=', trip).order('stage', 'ASC').all()
    ]);
    return { meta, stages };
  });

  if (!data.value?.meta || !data.value.stages.length) {
    throw createError({ statusCode: 404, statusMessage: 'Gallery not found' });
  }

  return {
    meta: computed(() => data.value!.meta!),
    stages: computed(() => data.value!.stages)
  };
}
