<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Trash2, Box, ShieldCheck } from 'lucide-vue-next'
import { admin, ApiError } from '@/lib/api'
import AdminLayout from '@/layouts/AdminLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AppModal from '@/components/ui/AppModal.vue'

interface Application {
  id: string
  name: string
  auth_methods: string[]
  is_active: boolean
  created_at: string
}

const apps = ref<Application[]>([])
const loading = ref(true)

// Controle do Modal
const isModalOpen = ref(false)
const newAppName = ref('')
const creating = ref(false)

async function loadApps() {
  loading.value = true
  try {
    const data = await admin.getApplications()
    // A API em Go retorna null caso não encontre (dependendo de como foi feito).
    apps.value = data || []
  } catch (error) {
    toast.error('Erro ao carregar aplicações. Verifique a conexão com o servidor Go.')
  } finally {
    loading.value = false
  }
}

async function onCreate() {
  if (!newAppName.value) return
  creating.value = true
  try {
    await admin.createApplication({ 
      name: newAppName.value, 
      // Por padrão na criação enviamos os dois métodos de autenticação suportados
      auth_methods: ['PASSWORD', 'PASSWORDLESS'] 
    })
    toast.success('Aplicação registrada com sucesso!')
    isModalOpen.value = false
    newAppName.value = ''
    await loadApps() // Recarrega a tabela
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao criar aplicação')
  } finally {
    creating.value = false
  }
}

async function onDelete(id: string, name: string) {
  if (!confirm(`TEM CERTEZA ABSOLUTA?\n\nIsso irá deletar permanentemente a aplicação "${name}" e todos os usuários perderão acesso a ela.`)) return
  
  try {
    await admin.deleteApplication(id)
    toast.success(`Aplicação "${name}" excluída.`)
    await loadApps()
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao deletar')
  }
}

onMounted(() => {
  loadApps()
})
</script>

<template>
  <AdminLayout>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Aplicações Conectadas</h1>
        <p class="text-muted-foreground mt-1 text-sm sm:text-base">Gerencie os sistemas terceiros que utilizam o nayz-auth.</p>
      </div>
      <BaseButton @click="isModalOpen = true" variant="primary">
        <Plus class="w-4 h-4 mr-2" />
        Registrar Aplicação
      </BaseButton>
    </div>

    <!-- Container da Tabela / Estado -->
    <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      
      <!-- Skeleton de Loading Maravilhoso -->
      <div v-if="loading" class="p-6 space-y-4">
        <div v-for="i in 3" :key="i" class="flex items-center space-x-4 animate-pulse">
          <div class="h-10 w-10 bg-muted rounded-md"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-muted rounded w-1/4"></div>
            <div class="h-3 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>

      <!-- Empty State Amigável -->
      <div v-else-if="apps.length === 0" class="flex flex-col items-center justify-center p-16 text-center animate-in fade-in">
        <div class="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
          <Box class="h-10 w-10 text-primary" />
        </div>
        <h3 class="text-xl font-bold mb-2 text-foreground">Ecossistema Vazio</h3>
        <p class="text-muted-foreground max-w-md mb-8">
          Você ainda não cadastrou nenhuma aplicação no Identity Provider. Integre seu primeiro produto (E-Commerce, ERP, etc) para começar a gerenciar acessos.
        </p>
        <BaseButton @click="isModalOpen = true" variant="outline" size="lg">Registrar Minha Primeira App</BaseButton>
      </div>

      <!-- Tabela Real Rica em Detalhes -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Identificação</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Status</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Segurança / Login</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="app in apps" :key="app.id" class="bg-card hover:bg-muted/30 transition-colors group">
              
              <!-- Coluna 1: Nome e ID -->
              <td class="px-6 py-4">
                <div class="font-bold text-foreground text-base">{{ app.name }}</div>
                <div class="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                  ID: {{ app.id }}
                </div>
              </td>
              
              <!-- Coluna 2: Status Tag -->
              <td class="px-6 py-4">
                <span v-if="app.is_active" class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-500/10 text-green-600 border-green-500/20 shadow-sm">
                  <div class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></div> Ativa
                </span>
                <span v-else class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive border-destructive/20 shadow-sm">
                  <div class="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5"></div> Inativa
                </span>
              </td>
              
              <!-- Coluna 3: Métodos de Auth -->
              <td class="px-6 py-4">
                <div class="flex gap-2 flex-wrap">
                  <span 
                    v-for="method in app.auth_methods" 
                    :key="method" 
                    class="inline-flex items-center rounded-md border border-border px-2 py-1 text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wider"
                  >
                    <ShieldCheck class="w-3 h-3 mr-1" />
                    {{ method }}
                  </span>
                </div>
              </td>
              
              <!-- Coluna 4: Ações Destrutivas -->
              <td class="px-6 py-4 text-right">
                <button 
                  @click="onDelete(app.id, app.name)"
                  class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                  title="Excluir Aplicação"
                >
                  <Trash2 class="w-5 h-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- AppModal: Nova Aplicação -->
    <AppModal v-model="isModalOpen" title="Criar Aplicação" description="Um Application ID único será gerado automaticamente para você integrar em seu frontend ou backend.">
      <form @submit.prevent="onCreate" class="space-y-6 mt-4">
        
        <BaseInput 
          v-model="newAppName" 
          label="Nome Descritivo" 
          placeholder="Ex: ERP Corporativo, App de Vendas..." 
          required 
        />
        
        <!-- Info de Contexto -->
        <div class="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          <span class="font-semibold text-primary">Dica:</span> Ao criar, esta aplicação suportará automaticamente Autenticação Fixa (Senha) e Passwordless (Código).
        </div>

        <div class="flex justify-end space-x-3 pt-2">
          <BaseButton type="button" variant="ghost" @click="isModalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :is-loading="creating">Gerar Aplicação</BaseButton>
        </div>
      </form>
    </AppModal>

  </AdminLayout>
</template>
