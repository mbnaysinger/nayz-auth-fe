<script setup lang="ts">
import AdminLayout from '@/layouts/AdminLayout.vue'
</script>

<template>
  <AdminLayout>
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      <p class="text-muted-foreground mt-1">Bem-vindo à central administrativa do nayz-auth. Selecione um módulo na barra lateral.</p>
    </div>

    <!-- Skeleton Base Animado (Estudo de UX para quando a API estiver conectada) -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <!-- Card Skeleton 1 -->
      <div class="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div class="h-10 w-10 bg-primary/10 rounded-lg mb-4 flex items-center justify-center">
            <div class="h-5 w-5 bg-primary/30 rounded animate-pulse"></div>
          </div>
          <div class="h-5 bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
          <div class="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
        </div>
        <div class="h-8 bg-muted rounded w-1/4 mt-6 animate-pulse"></div>
      </div>

      <!-- Card Skeleton 2 -->
      <div class="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div class="h-10 w-10 bg-secondary/30 rounded-lg mb-4 flex items-center justify-center">
            <div class="h-5 w-5 bg-secondary/50 rounded animate-pulse"></div>
          </div>
          <div class="h-5 bg-muted rounded w-1/2 mb-2 animate-pulse"></div>
          <div class="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
        </div>
        <div class="h-8 bg-muted rounded w-1/4 mt-6 animate-pulse"></div>
      </div>
    </div>
  </AdminLayout>
</template>
