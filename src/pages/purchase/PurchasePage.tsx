import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { usePageTitle } from '@/components/layout/pageTitle'
import { Panel } from '@/components/domain/Panel'
import { PhotoSlots } from '@/components/domain/PhotoSlots'
import { Button, Checkbox, Dropdown, NumberField, TextField, toast } from '@/components/ui'
import { CONFIRM_BLOCKERS, CURRENCY_DECIMALS, PURCHASE_TYPE_LABEL, TODAY } from '@/domain/constants'
import { nowStamp } from '@/domain/format'
import { evaluateGates, riskOf } from '@/domain/gates'
import { applyDraft, isHandoverDone, PREVIEW_IDS, validateDraft, type PurchaseDraft } from '@/domain/purchaseDraft'
import { can, permissionHint } from '@/domain/rules'
import type { PurchaseType } from '@/domain/types'
import { calcVat } from '@/domain/vat'
import { lookupVin, normalizeVin, VIN_PATTERN } from '@/domain/vin'
import { useCurrentUser, useData, useErpStore } from '@/store'
import { EvidenceChecklist } from './EvidenceChecklist'
import { RiskPreview } from './RiskPreview'

// 시연용 VIN (외부 조회 mock 결과가 준비된 값)
const DEMO_VINS = [
  { label: '정상 VIN', vin: 'KMHE341DBNA000512' },
  { label: '압류 VIN', vin: 'KMHE341DBNA000147' },
  { label: '도난 VIN', vin: 'KNAGM4AD5K5000923' },
]

const EMPTY: PurchaseDraft = {
  vin: '',
  plateNumber: '',
  manufacturer: '',
  model: '',
  modelYear: null,
  mileage: null,
  purchaseType: 'DEALER',
  vendorId: null,
  sellerName: '',
  amount: null,
  paymentMethod: 'BANK_TRANSFER',
  purchaseDate: TODAY,
  evidences: [],
  handover: { plateChecked: false, photoCount: 0 },
}

const YEARS = Array.from({ length: 15 }, (_, i) => String(2025 - i))

export function PurchasePage() {
  usePageTitle('매입 등록', '입력하는 순간 VIN 조회와 증빙 요건을 판정합니다.')
  const data = useData()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const registerPurchase = useErpStore((s) => s.registerPurchase)
  const [draft, setDraft] = useState<PurchaseDraft>(EMPTY)
  const update = (patch: Partial<PurchaseDraft>) => setDraft((d) => ({ ...d, ...patch }))

  // 제조사·모델 목록은 기존 차량 데이터에서
  const catalog = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const v of Object.values(data.vehicles)) {
      if (!map.has(v.manufacturer)) map.set(v.manufacturer, new Set())
      map.get(v.manufacturer)!.add(v.model)
    }
    return map
  }, [data.vehicles])

  const vendorType = draft.purchaseType === 'DEALER' ? 'BUSINESS' : 'AUCTION_HOUSE'
  const vendorOptions = Object.values(data.vendors)
    .filter((v) => v.type === vendorType)
    .map((v) => ({ value: v.id, label: `${v.name} (${v.bizRegNo})` }))

  // 초안을 그대로 판정 로직에 넣어 실시간 미리보기
  const preview = useMemo(() => {
    const at = nowStamp()
    const db = applyDraft(data, draft, PREVIEW_IDS, user.id, at)
    // 아직 입력하지 않은 항목은 판정에서 뺀다 (VIN 미입력 → H3, 매입처 미선택 → H5)
    const pending = (code: string) =>
      (code === 'H3' && !VIN_PATTERN.test(draft.vin)) ||
      (code === 'H5' && draft.purchaseType !== 'INDIVIDUAL' && !draft.vendorId)
    const gates = evaluateGates(PREVIEW_IDS.vehicleId, db).filter((g) => !pending(g.code))
    const vat = calcVat(db.purchases[PREVIEW_IDS.vehicleId], db.evidences.filter((e) => e.vehicleId === PREVIEW_IDS.vehicleId), db.policy)
    return {
      gates,
      risk: riskOf(gates),
      vat,
      vinCheck: VIN_PATTERN.test(draft.vin) ? lookupVin(draft.vin, data, at) : undefined,
    }
  }, [data, draft, user.id])

  const invalid = validateDraft(draft, data)
  const confirmBlockers = preview.gates.filter((g) => CONFIRM_BLOCKERS.includes(g.code))
  const vc = preview.vinCheck
  // 도난·압류·저당 차량은 등록 자체를 막는다 (해제 확인 후 재조회)
  const vinBlocked = !!vc && (vc.theft || vc.seizure || vc.lien)
  const missingVatEvidence = data.policy.vatEvidence[draft.purchaseType].some((k) => !draft.evidences.some((e) => e.kind === k))
  const allowed = can(user.role, 'REGISTER_PURCHASE')
  // VIN은 17자리를 다 입력하면 형식(I·O·Q)·중복 오류를 바로 보여준다
  const vinError = draft.vin.length === 17 ? invalid.find((r) => r.includes('VIN')) : undefined
  const confirmDisabledReason = !isHandoverDone(draft)
    ? '실물 인수(차량번호 확인·외관 사진)가 끝나야 확정할 수 있습니다.'
    : confirmBlockers.length
      ? `확정 불가: ${confirmBlockers.map((g) => g.title).join(', ')}`
      : null

  const submit = (confirm: boolean) => {
    const result = registerPurchase(draft, { confirm })
    if (!result.ok) {
      toast.error(result.reasons[0])
      return
    }
    toast.success(confirm ? '매입을 등록하고 확정했습니다' : '매입을 등록했습니다')
    navigate(`/vehicles/${result.id}`)
  }

  const setType = (purchaseType: PurchaseType) =>
    update({
      purchaseType,
      vendorId: null,
      sellerName: '',
      paymentMethod: 'BANK_TRANSFER',
      // 유형이 바뀌면 해당 유형에 없는 증빙은 제외
      evidences: draft.evidences.filter((e) => [...data.policy.requiredEvidence[purchaseType], 'SIMPLE_RECEIPT'].includes(e.kind)),
    })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
      <div className="flex flex-col gap-5">
        <Panel title="차량">
          <div className="flex flex-col gap-2">
            <TextField
              size="sm"
              label="VIN (차대번호)"
              required
              placeholder="17자리 — 입력 즉시 압류·도난 조회"
              value={draft.vin}
              onChange={(e) => update({ vin: normalizeVin(e.target.value) })}
              suffix={`${draft.vin.length}/17`}
              error={vinError}
            />
            <div className="flex items-center gap-1">
              <span className="text-caption-md text-gray-50">시연 입력</span>
              {DEMO_VINS.map((d) => (
                <Button key={d.vin} variant="text" size="sm" onClick={() => update({ vin: d.vin })}>
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField size="sm" label="차량번호" required placeholder="예) 123가4567" value={draft.plateNumber} onChange={(e) => update({ plateNumber: e.target.value })} />
            <Dropdown
              size="sm"
              label="연식"
              required
              value={draft.modelYear ? String(draft.modelYear) : null}
              onChange={(y) => update({ modelYear: Number(y) })}
              options={YEARS.map((y) => ({ value: y, label: `${y}년식` }))}
             
            />
            <Dropdown
              size="sm"
              label="제조사"
              required
              value={draft.manufacturer || null}
              onChange={(m) => update({ manufacturer: m, model: '' })}
              options={[...catalog.keys()].map((m) => ({ value: m, label: m }))}
             
            />
            <Dropdown
              size="sm"
              label="모델"
              required
              disabled={!draft.manufacturer}
              value={draft.model || null}
              onChange={(m) => update({ model: m })}
              options={[...(catalog.get(draft.manufacturer) ?? [])].map((m) => ({ value: m, label: m }))}
            />
            <NumberField size="sm" label="주행거리" value={draft.mileage} onChange={(n) => update({ mileage: n })} suffix="km" />
          </div>
        </Panel>

        <Panel title="매입">
          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              size="sm"
              label="매입 유형"
              required
              value={draft.purchaseType}
              onChange={setType}
              options={(Object.keys(PURCHASE_TYPE_LABEL) as PurchaseType[]).map((t) => ({ value: t, label: PURCHASE_TYPE_LABEL[t] }))}
            />
            {draft.purchaseType === 'INDIVIDUAL' ? (
              <TextField size="sm" label="매도인 성명" required value={draft.sellerName} onChange={(e) => update({ sellerName: e.target.value })} />
            ) : (
              <Dropdown
                size="sm"
                label={draft.purchaseType === 'DEALER' ? '매입처 (딜러)' : '매입처 (경매장)'}
                required
                value={draft.vendorId}
                onChange={(id) => update({ vendorId: id })}
                options={vendorOptions}
               
              />
            )}
            <NumberField
              size="sm"
              label="매입가 (부가세 포함)"
              required
              value={draft.amount}
              onChange={(n) => update({ amount: n })}
              decimals={CURRENCY_DECIMALS.KRW}
              suffix="KRW"
             
            />
            <Dropdown
              size="sm"
              label="지급 방법"
              required
              value={draft.paymentMethod}
              onChange={(m) => update({ paymentMethod: m })}
              options={[
                { value: 'BANK_TRANSFER', label: '계좌이체' },
                { value: 'CASH', label: '현금' },
              ]}
            />
            <TextField size="sm" type="date" label="매입일" required max={TODAY} value={draft.purchaseDate} onChange={(e) => update({ purchaseDate: e.target.value })} />
          </div>
        </Panel>

        <Panel title={`증빙 — ${PURCHASE_TYPE_LABEL[draft.purchaseType]}`}>
          <EvidenceChecklist
            purchaseType={draft.purchaseType}
            policy={data.policy}
            files={draft.evidences}
            onChange={(evidences) => update({ evidences })}
          />
        </Panel>

        <Panel title="실물 인수" actions={<span className="text-caption-md text-gray-70">인수가 끝나야 매입을 확정할 수 있습니다</span>}>
          <Checkbox
            checked={draft.handover.plateChecked}
            onChange={(e) => update({ handover: { ...draft.handover, plateChecked: e.target.checked } })}
            label="차량번호 실물 일치 확인"
          />
          <PhotoSlots count={draft.handover.photoCount} onChange={(photoCount) => update({ handover: { ...draft.handover, photoCount } })} />
        </Panel>
      </div>

      <div className="sticky top-21 flex flex-col gap-4">
        <RiskPreview
          vinValid={VIN_PATTERN.test(draft.vin)}
          vinCheck={preview.vinCheck}
          gates={preview.gates}
          vat={preview.vat}
          purchaseType={draft.purchaseType}
          vendorSelected={draft.purchaseType === 'INDIVIDUAL' ? !!draft.sellerName.trim() : !!draft.vendorId}
          hasAmount={!!draft.amount}
          missingVatEvidence={missingVatEvidence}
          missingFields={invalid.length}
        />
        <div className="flex flex-col gap-2">
          <Button size="lg" disabled={!allowed || vinBlocked || invalid.length > 0} onClick={() => submit(false)}>
            매입 등록
          </Button>
          <Button
            size="lg"
            variant="outlined"
            disabled={!allowed || vinBlocked || invalid.length > 0 || !!confirmDisabledReason}
            onClick={() => submit(true)}
          >
            등록 후 매입 확정
          </Button>
          {!allowed ? (
            <p className="text-caption-md text-gray-70">{permissionHint('REGISTER_PURCHASE')}이 필요합니다.</p>
          ) : vinBlocked ? null : invalid.length > 0 ? (
            <p className="text-caption-md text-gray-70">필수 항목(*)을 모두 입력하면 등록할 수 있습니다.</p>
          ) : (
            <p className="text-caption-md text-gray-70">{confirmDisabledReason ?? '제출된 증빙은 회계 검증을 거쳐 매입세액으로 확보됩니다.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
