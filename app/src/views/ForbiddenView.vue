<template>
  <section
    class="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center"
  >
    <i class="pi pi-lock text-primary text-3xl" aria-hidden="true" />
    <h1 class="text-2xl font-bold">No tienes permiso para ver esta página</h1>
    <p>Tu rol no tiene acceso a esta sección.</p>
    <RouterLink to="/" class="text-primary font-medium underline"
      >Volver al inicio</RouterLink
    >
  </section>
</template>
