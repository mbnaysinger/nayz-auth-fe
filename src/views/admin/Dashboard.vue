<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { Component, Users, Contact } from 'lucide-vue-next'
import { admin, ApiError } from '@/lib/api'
import AdminLayout from '@/layouts/AdminLayout.vue'

const loading = ref(true)
const counts = ref({ applications: 0, users: 0, persons: 0 })

const cards = [
  { key: 'applications' as const, label: 'Aplicações', description: 'Sistemas integrados ao Identity Provider', icon: Component, route: '/admin/applications' },
  { key: 'users' as const, label: 'Usuários', description: 'Contas de acesso cadastradas', icon: Users, route: '/admin/users' },
  { key: 'persons' as const, label: 'Pessoas', description: 'Pessoas físicas registradas', icon: Contact, route: '/admin/persons' },
]

onMounted(async () => {
  try {
    const [applications, users, persons] = await Promise.all([
      admin.getApplications(),
      admin.getUsers(),
      admin.getPersons(),
    ])
    counts.value = {
      applications: applications.length,
      users: users.length,
      persons: persons.length,
    }
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Erro ao carregar os indicadores do dashboard')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <AdminLayout>
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      <p class="text-muted-foreground mt-1">Bem-vindo à central administrativa do nayz-auth. Visão geral do ecossistema.</p>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="card in cards"
        :key="card.key"
        :to="card.route"
        class="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all group"
      >
        <div>
          <div class="h-10 w-10 bg-primary/10 rounded-lg mb-4 flex items-center justify-center">
            <component :is="card.icon" class="h-5 w-5 text-primary" />
          </div>
          <div class="font-semibold text-foreground">{{ card.label }}</div>
          <p class="text-sm text-muted-foreground mt-1">{{ card.description }}</p>
        </div>

        <!-- Contagem (skeleton enquanto carrega) -->
        <div class="mt-6">
          <div v-if="loading" class="h-9 bg-muted rounded w-1/4 animate-pulse"></div>
          <div v-else class="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
            {{ counts[card.key] }}
          </div>
        </div>
      </RouterLink>
    </div>
  </AdminLayout>
</template>
