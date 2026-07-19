<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { ArrowLeft, Shield, KeySquare, Plus, Trash2, Loader2 } from 'lucide-vue-next'
import { admin, ApiError } from '@/lib/api'
import type { Application, Permission, Role } from '@/types'
import AdminLayout from '@/layouts/AdminLayout.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
// Extrai o ID da aplicação a partir da URL (/admin/applications/:id)
const appId = route.params.id as string

const application = ref<Application | null>(null)
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const loading = ref(true)

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

onMounted(async () => {
  try {
    const [apps, appRoles, appPermissions] = await Promise.all([
      admin.getApplications(),
      admin.getRolesByApp(appId),
      admin.getPermissionsByApp(appId),
    ])
    application.value = apps.find((a) => a.id === appId) ?? null
    roles.value = appRoles
    permissions.value = appPermissions
  } catch (error) {
    toast.error(errorMessage(error, 'Erro ao carregar os dados da aplicação'))
  } finally {
    loading.value = false
  }
})

// ---------------------------------------------------------------------------
// ROLES
// ---------------------------------------------------------------------------

const isRoleModalOpen = ref(false)
const newRoleName = ref('')
const creatingRole = ref(false)
const roleToDelete = ref<Role | null>(null)
const deletingRole = ref(false)

function openRoleModal() {
  newRoleName.value = ''
  isRoleModalOpen.value = true
}

async function onCreateRole() {
  if (!newRoleName.value.trim()) return
  creatingRole.value = true
  try {
    const role = await admin.createRole(appId, { name: newRoleName.value.trim().toUpperCase() })
    roles.value = [...roles.value, role]
    toast.success('Perfil de acesso (Role) criado com sucesso!')
    isRoleModalOpen.value = false
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao criar a role'))
  } finally {
    creatingRole.value = false
  }
}

async function onDeleteRole() {
  if (!roleToDelete.value) return
  deletingRole.value = true
  try {
    await admin.deleteRole(roleToDelete.value.id)
    toast.success(`A Role "${roleToDelete.value.name}" foi excluída permanentemente.`)
    roles.value = roles.value.filter((r) => r.id !== roleToDelete.value!.id)
    if (selectedRole.value?.id === roleToDelete.value.id) {
      selectedRole.value = null
    }
    roleToDelete.value = null
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao deletar a role'))
  } finally {
    deletingRole.value = false
  }
}

// --- Composição role x permissions ---

const selectedRole = ref<Role | null>(null)
const rolePermissionIds = ref<Set<string>>(new Set())
const loadingRolePermissions = ref(false)
const pendingPermissionIds = ref<Set<string>>(new Set())

async function selectRole(role: Role) {
  if (selectedRole.value?.id === role.id) {
    selectedRole.value = null
    return
  }
  selectedRole.value = role
  loadingRolePermissions.value = true
  rolePermissionIds.value = new Set()
  try {
    const linked = await admin.getRolePermissions(role.id)
    rolePermissionIds.value = new Set(linked.map((p) => p.id))
  } catch (error) {
    toast.error(errorMessage(error, 'Erro ao carregar as permissions da role'))
  } finally {
    loadingRolePermissions.value = false
  }
}

// Marcar/desmarcar aplica imediatamente via POST/DELETE
async function togglePermission(permission: Permission) {
  if (!selectedRole.value || pendingPermissionIds.value.has(permission.id)) return
  const role = selectedRole.value
  const isLinked = rolePermissionIds.value.has(permission.id)
  pendingPermissionIds.value = new Set([...pendingPermissionIds.value, permission.id])
  try {
    if (isLinked) {
      await admin.removePermissionFromRole(role.id, permission.id)
      const next = new Set(rolePermissionIds.value)
      next.delete(permission.id)
      rolePermissionIds.value = next
      toast.success(`Permission "${permission.name}" desvinculada de ${role.name}`)
    } else {
      await admin.addPermissionToRole(role.id, permission.id)
      rolePermissionIds.value = new Set([...rolePermissionIds.value, permission.id])
      toast.success(`Permission "${permission.name}" vinculada a ${role.name}`)
    }
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao atualizar a composição da role'))
  } finally {
    const next = new Set(pendingPermissionIds.value)
    next.delete(permission.id)
    pendingPermissionIds.value = next
  }
}

// ---------------------------------------------------------------------------
// PERMISSIONS
// ---------------------------------------------------------------------------

// Formato recurso:acao (opcionalmente recurso:acao:escopo)
const PERMISSION_REGEX = /^[a-z0-9-]+:[a-z0-9-]+(:[a-z0-9-]+)?$/

const isPermissionModalOpen = ref(false)
const newPermissionName = ref('')
const creatingPermission = ref(false)
const permissionToDelete = ref<Permission | null>(null)
const deletingPermission = ref(false)

const permissionFormatError = computed(() => {
  const value = newPermissionName.value.trim()
  if (!value) return ''
  return PERMISSION_REGEX.test(value)
    ? ''
    : 'Formato inválido. Use recurso:acao (minúsculas, números e hífens). Ex.: squads:manage'
})

function openPermissionModal() {
  newPermissionName.value = ''
  isPermissionModalOpen.value = true
}

async function onCreatePermission() {
  const name = newPermissionName.value.trim()
  if (!name || permissionFormatError.value) return
  creatingPermission.value = true
  try {
    const permission = await admin.createPermission(appId, { name })
    permissions.value = [...permissions.value, permission]
    toast.success('Permission criada com sucesso!')
    isPermissionModalOpen.value = false
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao criar a permission'))
  } finally {
    creatingPermission.value = false
  }
}

async function onDeletePermission() {
  if (!permissionToDelete.value) return
  deletingPermission.value = true
  try {
    await admin.deletePermission(permissionToDelete.value.id)
    toast.success(`Permission "${permissionToDelete.value.name}" excluída.`)
    permissions.value = permissions.value.filter((p) => p.id !== permissionToDelete.value!.id)
    const next = new Set(rolePermissionIds.value)
    next.delete(permissionToDelete.value.id)
    rolePermissionIds.value = next
    permissionToDelete.value = null
  } catch (error) {
    toast.error(errorMessage(error, 'Falha ao deletar a permission'))
  } finally {
    deletingPermission.value = false
  }
}
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
            {{ application?.name || 'Gestão Detalhada' }}
          </h1>
          <p class="text-muted-foreground mt-2 text-sm font-mono bg-muted inline-block px-2 py-0.5 rounded border border-border">App ID: {{ appId }}</p>
          <p v-if="application" class="text-sm text-muted-foreground mt-2">
            Métodos: {{ application.auth_methods.join(', ') }} · {{ application.is_active ? 'Ativa' : 'Inativa' }}
            <template v-if="application.require_person"> · Exige pessoa vinculada</template>
          </p>
        </div>
      </div>
    </div>

    <!-- Loading geral -->
    <div v-if="loading" class="p-8 flex justify-center">
      <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>

    <!-- Duas seções lado a lado: Roles e Permissions -->
    <div v-else class="grid gap-6 lg:grid-cols-2 items-start">

      <!-- ==============================================
           SEÇÃO 1: ROLES + COMPOSIÇÃO
           ============================================== -->
      <section class="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div class="flex justify-between items-center px-5 py-4 border-b border-border">
          <h2 class="text-lg font-semibold text-foreground flex items-center">
            <Shield class="w-4 h-4 mr-2 text-primary" /> Papéis (Roles)
          </h2>
          <BaseButton @click="openRoleModal" variant="primary" size="sm">
            <Plus class="w-4 h-4 mr-2" /> Criar Role
          </BaseButton>
        </div>

        <!-- Empty State -->
        <div v-if="roles.length === 0" class="flex flex-col items-center justify-center p-10 text-center">
          <div class="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
            <Shield class="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-semibold mb-1 text-foreground">Nenhuma Role Criada</h3>
          <p class="text-muted-foreground max-w-sm">Crie papéis como "ADMIN" ou "VENDEDOR" e selecione um deles para compor suas permissions.</p>
        </div>

        <!-- Lista de roles (selecionável) -->
        <ul v-else class="p-3 space-y-1">
          <li v-for="role in roles" :key="role.id">
            <div
              class="flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors group"
              :class="selectedRole?.id === role.id ? 'bg-primary/10' : 'hover:bg-muted/50'"
              @click="selectRole(role)"
            >
              <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wider bg-primary/10 text-primary border border-primary/20">
                {{ role.name }}
              </span>
              <div class="flex items-center gap-2">
                <span v-if="selectedRole?.id === role.id" class="text-xs text-primary font-medium">selecionada</span>
                <button
                  @click.stop="roleToDelete = role"
                  class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all outline-none"
                  title="Excluir Role"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </li>
        </ul>

        <!-- Painel de composição da role selecionada -->
        <div v-if="selectedRole" class="border-t border-border p-5">
          <h3 class="text-sm font-semibold text-foreground mb-1">
            Permissions de <span class="text-primary">{{ selectedRole.name }}</span>
          </h3>
          <p class="text-xs text-muted-foreground mb-3">
            Marque para vincular / desmarque para desvincular — a alteração é aplicada imediatamente.
          </p>

          <div v-if="loadingRolePermissions" class="flex justify-center py-6">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <p v-else-if="permissions.length === 0" class="text-sm text-muted-foreground py-2">
            Esta aplicação ainda não possui permissions. Crie-as na seção ao lado.
          </p>
          <ul v-else class="space-y-1 max-h-64 overflow-y-auto pr-1">
            <li v-for="permission in permissions" :key="permission.id">
              <label
                class="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm transition-colors"
                :class="pendingPermissionIds.has(permission.id) ? 'opacity-60 pointer-events-none' : ''"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                  :checked="rolePermissionIds.has(permission.id)"
                  @change="togglePermission(permission)"
                />
                <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{{ permission.name }}</code>
                <Loader2 v-if="pendingPermissionIds.has(permission.id)" class="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
              </label>
            </li>
          </ul>
        </div>
      </section>

      <!-- ==============================================
           SEÇÃO 2: PERMISSIONS
           ============================================== -->
      <section class="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div class="flex justify-between items-center px-5 py-4 border-b border-border">
          <h2 class="text-lg font-semibold text-foreground flex items-center">
            <KeySquare class="w-4 h-4 mr-2 text-primary" /> Permissions
          </h2>
          <BaseButton @click="openPermissionModal" variant="primary" size="sm">
            <Plus class="w-4 h-4 mr-2" /> Criar Permission
          </BaseButton>
        </div>

        <!-- Empty State -->
        <div v-if="permissions.length === 0" class="flex flex-col items-center justify-center p-10 text-center">
          <div class="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
            <KeySquare class="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-semibold mb-1 text-foreground">Nenhuma Permission Criada</h3>
          <p class="text-muted-foreground max-w-sm">Crie permissions no formato <code class="bg-muted px-1 py-0.5 rounded font-mono">recurso:acao</code> (ex.: squads:manage) para compor as roles.</p>
        </div>

        <!-- Lista de permissions -->
        <ul v-else class="p-3 space-y-1">
          <li
            v-for="permission in permissions"
            :key="permission.id"
            class="flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{{ permission.name }}</code>
            <button
              @click="permissionToDelete = permission"
              class="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all outline-none"
              title="Excluir Permission"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- ==============================================
         MODAIS
         ============================================== -->
    <AppModal v-model="isRoleModalOpen" title="Cadastrar Nova Role" description="Crie um novo papel para segmentar autorizações (ex: GESTOR). O texto será convertido para MAIÚSCULO automaticamente.">
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

    <AppModal v-model="isPermissionModalOpen" title="Cadastrar Nova Permission" description="Permissions definem ações finas dentro da aplicação e são compostas nas roles.">
      <form @submit.prevent="onCreatePermission" class="space-y-4 mt-4">
        <BaseInput
          v-model="newPermissionName"
          label="Nome da Permission"
          placeholder="Ex: squads:manage"
          :error="permissionFormatError"
          required
        />
        <p class="text-xs text-muted-foreground">
          Formato <code class="bg-muted px-1 py-0.5 rounded font-mono">recurso:acao</code> (opcionalmente
          <code class="bg-muted px-1 py-0.5 rounded font-mono">recurso:acao:escopo</code>) — apenas letras minúsculas, números e hífens.
        </p>
        <div class="flex justify-end space-x-3 pt-2">
          <BaseButton type="button" variant="ghost" @click="isPermissionModalOpen = false">Cancelar</BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :is-loading="creatingPermission"
            :disabled="!newPermissionName.trim() || !!permissionFormatError"
          >
            Criar Permission
          </BaseButton>
        </div>
      </form>
    </AppModal>

    <!-- Confirmações de exclusão -->
    <ConfirmModal
      :model-value="roleToDelete !== null"
      title="Excluir Role"
      :message="`A exclusão de uma Role afeta todos os usuários vinculados a ela. Excluir a Role “${roleToDelete?.name}”?`"
      :is-loading="deletingRole"
      @update:model-value="roleToDelete = null"
      @confirm="onDeleteRole"
    />
    <ConfirmModal
      :model-value="permissionToDelete !== null"
      title="Excluir Permission"
      :message="`Tem certeza que deseja excluir a permission “${permissionToDelete?.name}”?`"
      :is-loading="deletingPermission"
      @update:model-value="permissionToDelete = null"
      @confirm="onDeletePermission"
    />

  </AdminLayout>
</template>
