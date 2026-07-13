<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { ArrowLeft, Shield, Users, Plus, Trash2, Link } from 'lucide-vue-next'
import { admin, ApiError } from '@/lib/api'
import AdminLayout from '@/layouts/AdminLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AppModal from '@/components/ui/AppModal.vue'

const route = useRoute()
const router = useRouter()
// Extrai o ID da aplicação a partir da URL (/admin/applications/:id)
const appId = route.params.id as string

interface Role {
  id: string
  name: string
  application_id: string
}

const activeTab = ref<'roles' | 'users'>('roles')
const roles = ref<Role[]>([])
const loading = ref(true)

// Modais
const isRoleModalOpen = ref(false)
const newRoleName = ref('')
const creatingRole = ref(false)

const targetUserId = ref('')
const targetRoleId = ref('')
const assigning = ref(false)

async function loadRoles() {
  loading.value = true
  try {
    const data = await admin.getRolesByApp(appId)
    roles.value = data || []
  } catch (error) {
    toast.error('Erro ao carregar os perfis de acesso da aplicação')
  } finally {
    loading.value = false
  }
}

async function onCreateRole() {
  if (!newRoleName.value) return
  creatingRole.value = true
  try {
    await admin.createRole(appId, { name: newRoleName.value.toUpperCase() })
    toast.success('Perfil de acesso (Role) criado com sucesso!')
    isRoleModalOpen.value = false
    newRoleName.value = ''
    await loadRoles()
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao criar')
  } finally {
    creatingRole.value = false
  }
}

async function onDeleteRole(id: string, name: string) {
  if (!confirm(`TEM CERTEZA ABSOLUTA?\n\nA exclusão de uma Role afeta todos os usuários vinculados a ela.\n\nExcluir Role: ${name}?`)) return
  try {
    await admin.deleteRole(id)
    toast.success(`A Role "${name}" foi excluída permanentemente.`)
    await loadRoles()
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao deletar')
  }
}

async function onAssignRole() {
  if (!targetUserId.value || !targetRoleId.value) {
    toast.error('Preencha o ID do Usuário e selecione uma Role')
    return
  }
  assigning.value = true
  try {
    await admin.assignRoleToUser(targetUserId.value, targetRoleId.value)
    toast.success('Permissão concedida ao usuário com êxito!')
    targetUserId.value = ''
    targetRoleId.value = ''
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Falha ao conceder permissão')
  } finally {
    assigning.value = false
  }
}

onMounted(() => {
  loadRoles()
})
</script>

<template>
  <AdminLayout>
    <!-- Navegação / Breadcrumb Minimalista -->
    <div class="mb-8">
      <button @click="router.push('/admin/applications')" class="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 group">
        <ArrowLeft class="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" /> Voltar para Aplicações
      </button>
      
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center">
            Gestão Detalhada
          </h1>
          <p class="text-muted-foreground mt-2 text-sm font-mono bg-muted inline-block px-2 py-0.5 rounded border border-border">App ID: {{ appId }}</p>
        </div>
      </div>
    </div>

    <!-- Abas Estilo Segmentadas -->
    <div class="border-b border-border mb-6">
      <nav class="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        <button 
          @click="activeTab = 'roles'"
          :class="activeTab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors outline-none"
        >
          <Shield class="w-4 h-4 mr-2" />
          Papéis (Roles)
        </button>
        <button 
          @click="activeTab = 'users'"
          :class="activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          class="whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors outline-none"
        >
          <Users class="w-4 h-4 mr-2" />
          Conceder Acessos
        </button>
      </nav>
    </div>

    <!-- ==============================================
         ABA 1: GESTÃO DE ROLES 
         ============================================== -->
    <div v-if="activeTab === 'roles'" class="animate-in fade-in slide-in-from-bottom-2">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-foreground">Matriz de Papéis</h2>
        <BaseButton @click="isRoleModalOpen = true" variant="primary" size="sm">
          <Plus class="w-4 h-4 mr-2" /> Criar Role
        </BaseButton>
      </div>

      <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        
        <!-- Loading -->
        <div v-if="loading" class="p-8 flex justify-center">
          <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="roles.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
          <div class="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
            <Shield class="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-semibold mb-1 text-foreground">Nenhuma Role Criada</h3>
          <p class="text-muted-foreground max-w-sm mb-6">Crie papéis como "ADMIN", "CAIXA" ou "COMPRADOR" para definir a hierarquia deste sistema.</p>
        </div>

        <!-- Tabela -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Identificador da Role</th>
                <th scope="col" class="px-6 py-4 font-semibold tracking-wider">Role ID (UUID)</th>
                <th scope="col" class="px-6 py-4 font-semibold tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="role in roles" :key="role.id" class="hover:bg-muted/30 transition-colors group">
                <td class="px-6 py-4">
                  <!-- Tag de Destaque -->
                  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {{ role.name }}
                  </span>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-muted-foreground">{{ role.id }}</td>
                <td class="px-6 py-4 text-right">
                  <button 
                    @click="onDeleteRole(role.id, role.name)" 
                    class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none" 
                    title="Excluir Role"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==============================================
         ABA 2: ATRIBUIÇÃO DE USUÁRIOS
         ============================================== -->
    <div v-if="activeTab === 'users'" class="animate-in fade-in slide-in-from-bottom-2">
      <div class="bg-card border border-border rounded-xl shadow-sm p-6 max-w-2xl mx-auto">
        <div class="flex items-center space-x-4 mb-6 pb-6 border-b border-border">
          <div class="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0 border border-primary/20">
            <Link class="h-6 w-6" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">Conceder Autorização</h3>
            <p class="text-sm text-muted-foreground">Adicione um usuário a um grupo (Role) para conceder acessos a esta aplicação.</p>
          </div>
        </div>

        <form @submit.prevent="onAssignRole" class="space-y-5">
          <BaseInput 
            v-model="targetUserId" 
            label="User ID (Identificador do Usuário)" 
            placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000" 
            required 
          />
          
          <div class="space-y-1.5 w-full">
            <label class="text-sm font-medium text-foreground">Selecionar Perfil (Role)</label>
            <div class="relative">
              <select 
                v-model="targetRoleId" 
                required
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled selected>Escolha o nível de permissão...</option>
                <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
            <p v-if="roles.length === 0" class="text-xs text-destructive mt-1">Crie pelo menos uma Role na aba anterior primeiro.</p>
          </div>

          <BaseButton type="submit" variant="primary" class="w-full mt-4" :is-loading="assigning" :disabled="roles.length === 0">
            Conceder Acesso
          </BaseButton>
        </form>

        <div class="mt-8 pt-6 border-t border-border rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground border-l-4 border-l-blue-500">
          <span class="font-bold text-foreground">Observação:</span> Para revogar o acesso, você pode utilizar a API diretamente via REST ou aguardar o lançamento da aba de exclusão na versão 1.1 do portal.
        </div>
      </div>
    </div>

    <!-- ==============================================
         MODAIS
         ============================================== -->
    <AppModal v-model="isRoleModalOpen" title="Cadastrar Nova Role" description="Crie um novo papel para segmentar autorizações (ex: GESTOR). O texto será convertido para MAIÚSCULO automaticamente pela API.">
      <form @submit.prevent="onCreateRole" class="space-y-6 mt-4">
        <BaseInput 
          v-model="newRoleName" 
          label="Nome do Papel" 
          placeholder="Ex: ADMIN" 
          required 
        />
        <div class="flex justify-end space-x-3 pt-2">
          <BaseButton type="button" variant="ghost" @click="isRoleModalOpen = false">Cancelar</BaseButton>
          <BaseButton type="submit" variant="primary" :is-loading="creatingRole">Criar Role</BaseButton>
        </div>
      </form>
    </AppModal>

  </AdminLayout>
</template>
