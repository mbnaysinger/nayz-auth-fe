<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Trash2, Box, ShieldCheck, Loader2 } from 'lucide-vue-next'
import { admin, ApiError } from '@/lib/api'
import { AUTH_METHODS, type Application, type AuthMethod } from '@/types'
import AdminLayout from '@/layouts/AdminLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

const apps = ref<Application[]>([])
const loading = ref(true)

// Controle do Modal de criação
const isModalOpen = ref(false)
const newAppName = ref('')
const newAppMethods = ref<AuthMethod[]>(['PASSWORD', 'PASSWORDLESS'])
const createError = ref('')
const creating = ref(false)

// Ativação / exclusão
const togglingId = ref<string | null>(null)
const appToDelete = ref<Application | null>(null)
const deleting = ref(false)

async function loadApps() {
  loading.value = true
  try {
    // A API em Go retorna null caso não encontre registros
    apps.value = await admin.getApplications()
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Erro ao carregar aplicações. Verifique a conexão com o servidor Go.')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  newAppName.value = ''
  newAppMethods.value = ['PASSWORD', 'PASSWORDLESS']
  createError.value = ''
  isModalOpen.value = true
}

function toggleMethod(method: AuthMethod) {
  if (newAppMethods.value.includes(method)) {
    newAppMethods.value = newAppMethods.value.filter((m) => m !== method)
  } else {
    newAppMethods.value = [...newAppMethods.value, method]
  }
}

async function onCreate() {
  createError.value = ''
  if (!newAppName.value.trim()) {
    createError.value = 'Informe o nome da aplicação.'
    return
  }
  if (newAppMethods.value.length === 0) {
    createError.value = 'Selecione ao menos um método de autenticação.'
    return
  }
  creating.value = true
  try {
    await admin.createApplication({
      name: newAppName.value.trim(),
      auth_methods: newAppMethods.value
    })
    toast.success('Aplicação registrada com sucesso!')
    isModalOpen.value = false
    await loadApps() // Recarrega a tabela
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao criar aplicação')
  } finally {
    creating.value = false
  }
}

async function onToggleActive(app: Application) {
  togglingId.value = app.id
  try {
    await admin.updateApplication(app.id, {
      name: app.name,
      auth_methods: app.auth_methods,
      is_active: !app.is_active
    })
    app.is_active = !app.is_active
    toast.success(app.is_active ? `Aplicação "${app.name}" ativada.` : `Aplicação "${app.name}" desativada.`)
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao atualizar a aplicação')
  } finally {
    togglingId.value = null
  }
}

async function onDelete() {
  if (!appToDelete.value) return
  deleting.value = true
  try {
    await admin.deleteApplication(appToDelete.value.id)
    toast.success(`Aplicação "${appToDelete.value.name}" excluída.`)
    appToDelete.value = null
    await loadApps()
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao deletar')
  } finally {
    deleting.value = false
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
      <BaseButton @click="openCreateModal" variant="primary">
        <Plus class="w-4 h-4 mr-2" />
        Registrar Aplicação
      </BaseButton>
    </div>

    <!-- Container da Tabela / Estado -->
    <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">

      <!-- Skeleton de Loading -->
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
        <BaseButton @click="openCreateModal" variant="outline" size="lg">Registrar Minha Primeira App</BaseButton>
      </div>

      <!-- Tabela -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Identificação</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Segurança / Login</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Exige Pessoa</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Ativa</th>
              <th scope="col" class="px-6 py-4 font-semibold tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="app in apps"
              :key="app.id"
              class="bg-card hover:bg-muted/30 transition-colors group cursor-pointer"
              @click="$router.push(`/admin/applications/${app.id}`)"
            >

              <!-- Coluna 1: Nome e ID -->
              <td class="px-6 py-4">
                <div class="font-bold text-foreground text-base">{{ app.name }}</div>
                <div class="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                  ID: {{ app.id }}
                </div>
              </td>

              <!-- Coluna 2: Métodos de Auth -->
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

              <!-- Coluna 3: Exige pessoa vinculada -->
              <td class="px-6 py-4 text-muted-foreground">
                {{ app.require_person ? 'Sim' : 'Não' }}
              </td>

              <!-- Coluna 4: Ativar / Desativar (PUT) -->
              <td class="px-6 py-4" @click.stop>
                <div class="flex items-center gap-2">
                  <ToggleSwitch
                    :model-value="app.is_active"
                    :disabled="togglingId === app.id"
                    :label="`Ativar/desativar ${app.name}`"
                    @update:model-value="onToggleActive(app)"
                  />
                  <Loader2 v-if="togglingId === app.id" class="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </td>

              <!-- Coluna 5: Ações -->
              <td class="px-6 py-4 text-right" @click.stop>
                <div class="flex items-center justify-end space-x-2">
                  <!-- Botão primário para Detalhes (Sempre visível) -->
                  <button
                    @click="$router.push(`/admin/applications/${app.id}`)"
                    class="p-2 text-primary hover:bg-primary/10 rounded-md transition-all outline-none border border-transparent hover:border-primary/20"
                    title="Gerenciar Roles e Permissions"
                  >
                    <ShieldCheck class="w-5 h-5" />
                  </button>

                  <!-- Botão de exclusão (Apenas visível no Hover) -->
                  <button
                    @click="appToDelete = app"
                    class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                    title="Excluir Aplicação"
                  >
                    <Trash2 class="w-5 h-5" />
                  </button>
                </div>
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

        <!-- Métodos de autenticação suportados -->
        <div class="space-y-1.5">
          <span class="text-sm font-medium text-foreground">Métodos de autenticação</span>
          <div class="flex gap-6 pt-1">
            <label v-for="method in AUTH_METHODS" :key="method" class="flex items-center gap-2 text-sm cursor-pointer text-foreground">
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary"
                :checked="newAppMethods.includes(method)"
                @change="toggleMethod(method)"
              />
              {{ method }}
            </label>
          </div>
        </div>

        <p v-if="createError" class="text-sm text-destructive font-medium">{{ createError }}</p>

        <div class="flex justify-end space-x-3 pt-2">
          <BaseButton type="button" variant="ghost" @click="isModalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :is-loading="creating">Gerar Aplicação</BaseButton>
        </div>
      </form>
    </AppModal>

    <!-- Confirmação de exclusão -->
    <ConfirmModal
      :model-value="appToDelete !== null"
      title="Excluir Aplicação"
      :message="`Isso irá deletar permanentemente a aplicação “${appToDelete?.name}” e todos os usuários perderão acesso a ela.`"
      :is-loading="deleting"
      @update:model-value="appToDelete = null"
      @confirm="onDelete"
    />

  </AdminLayout>
</template>
