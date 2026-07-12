<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>

<template>
  <div class="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
    <router-view />
    <Toaster position="top-right" richColors />
  </div>
</template>
