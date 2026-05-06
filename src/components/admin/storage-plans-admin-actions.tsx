import type { StorageCodeStatus } from '@shared/schemas'
import type { QuotaStorePackage } from '@shared/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  emptyPackageForm,
  packageFormFromPackage,
  packageInputFromForm,
  StoragePlanForm,
} from '@/components/admin/storage-plan-form'
import { StoragePlanList } from '@/components/admin/storage-plan-list'
import {
  codeInputFromForm,
  emptyCodeForm,
  StorageRedemptionCodePanel,
} from '@/components/admin/storage-redemption-code-panel'
import {
  createQuotaStorePackage,
  generateStorageRedemptionCodes,
  revokeStorageRedemptionCode,
  updateQuotaStorePackage,
} from '@/lib/api'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

type PackageFilter = 'all' | 'active' | 'disabled'

export function usePackageEditor() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<QuotaStorePackage | null>(null)
  const [form, setForm] = useState(emptyPackageForm)
  const mutation = usePackageMutation(editing, form, () => {
    setOpen(false)
    setEditing(null)
    setForm(emptyPackageForm)
  })
  return {
    open,
    editing,
    form,
    setForm,
    newPackage: () => {
      setEditing(null)
      setForm(emptyPackageForm)
      setOpen(true)
    },
    mutation,
    edit: (pkg: QuotaStorePackage) => editPackage(pkg, setEditing, setForm, setOpen),
    cancel: () => {
      setOpen(false)
      setEditing(null)
      setForm(emptyPackageForm)
    },
  }
}

export function useCodeActions() {
  const [form, setForm] = useState(emptyCodeForm)
  const [revokingCode, setRevokingCode] = useState<string | null>(null)
  const generate = useGenerateCodesMutation(form, () => setForm(emptyCodeForm))
  const revoke = useRevokeCodeMutation(setRevokingCode)
  return { form, setForm, revokingCode, generate, revoke }
}

export function PackagesTab({
  available,
  packages,
  editor,
}: {
  available: boolean
  packages: QuotaStorePackage[]
  editor: ReturnType<typeof usePackageEditor>
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<PackageFilter>('all')
  const visiblePackages = filterPackages(packages, filter)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Select value={filter} onValueChange={(value) => setFilter(value as PackageFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.storagePlans.packages.filterAll')}</SelectItem>
            <SelectItem value="active">{t('admin.storagePlans.packages.filterActive')}</SelectItem>
            <SelectItem value="disabled">{t('admin.storagePlans.packages.filterDisabled')}</SelectItem>
          </SelectContent>
        </Select>
        <Button disabled={!available} onClick={editor.newPackage}>
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.storagePlans.newPackage')}
        </Button>
      </div>
      <StoragePlanList packages={visiblePackages} onEdit={editor.edit} />
      <PackageDialog available={available} editor={editor} />
    </div>
  )
}

function PackageDialog({ available, editor }: { available: boolean; editor: ReturnType<typeof usePackageEditor> }) {
  const { t } = useTranslation()
  return (
    <Dialog open={editor.open} onOpenChange={(open) => (open ? editor.newPackage() : editor.cancel())}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editor.editing ? t('admin.storagePlans.editPackage') : t('admin.storagePlans.newPackage')}
          </DialogTitle>
        </DialogHeader>
        <StoragePlanForm
          editing={editor.editing}
          form={editor.form}
          available={available}
          pending={editor.mutation.isPending}
          onFormChange={editor.setForm}
          onCancel={editor.cancel}
          onSubmit={() => editor.mutation.mutate()}
        />
      </DialogContent>
    </Dialog>
  )
}

export function CodesTab({
  actions,
  available,
  codes,
  status,
  onStatusChange,
}: {
  actions: ReturnType<typeof useCodeActions>
  available: boolean
  codes: Parameters<typeof StorageRedemptionCodePanel>[0]['codes']
  status: StorageCodeStatus | 'all'
  onStatusChange: (status: StorageCodeStatus | 'all') => void
}) {
  return (
    <StorageRedemptionCodePanel
      codes={codes}
      status={status}
      form={actions.form}
      available={available}
      pending={actions.generate.isPending}
      revokingCode={actions.revokingCode}
      onStatusChange={onStatusChange}
      onFormChange={actions.setForm}
      onGenerate={() => actions.generate.mutate()}
      onRevoke={(code) => actions.revoke.mutate(code)}
    />
  )
}

function usePackageMutation(editing: QuotaStorePackage | null, form: typeof emptyPackageForm, onSaved: () => void) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => savePackage(editing, form),
    onSuccess: () => {
      onSaved()
      queryClient.invalidateQueries({ queryKey: ['admin', 'storage-plans'] })
      toast.success(t('admin.storagePlans.packageSaved'))
    },
    onError: (err) => toast.error(err.message),
  })
}

function useGenerateCodesMutation(form: typeof emptyCodeForm, onGenerated: () => void) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => generateStorageRedemptionCodes(codeInputFromForm(form)),
    onSuccess: () => {
      onGenerated()
      queryClient.invalidateQueries({ queryKey: ['admin', 'storage-plans', 'storage-codes'] })
      toast.success(t('admin.storagePlans.codes.generated'))
    },
    onError: (err) => toast.error(err.message),
  })
}

function useRevokeCodeMutation(setRevokingCode: (code: string | null) => void) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeStorageRedemptionCode,
    onMutate: (code) => setRevokingCode(code),
    onSettled: () => setRevokingCode(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'storage-plans', 'storage-codes'] })
      toast.success(t('admin.storagePlans.codes.revoked'))
    },
    onError: (err) => toast.error(err.message),
  })
}

function editPackage(
  pkg: QuotaStorePackage,
  setEditing: (pkg: QuotaStorePackage) => void,
  setForm: (form: typeof emptyPackageForm) => void,
  setOpen: (open: boolean) => void,
) {
  setEditing(pkg)
  setForm(packageFormFromPackage(pkg))
  setOpen(true)
}

function savePackage(editing: QuotaStorePackage | null, form: typeof emptyPackageForm) {
  const input = packageInputFromForm(form)
  return editing ? updateQuotaStorePackage(editing.id, input) : createQuotaStorePackage(input)
}

function filterPackages(packages: QuotaStorePackage[], filter: PackageFilter) {
  if (filter === 'active') return packages.filter((pkg) => pkg.active)
  if (filter === 'disabled') return packages.filter((pkg) => !pkg.active)
  return packages
}
