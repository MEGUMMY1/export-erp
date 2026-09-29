import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Field, Panel } from '@/components/domain/Panel'
import { usePageTitle } from '@/components/layout/pageTitle'
import { Button, Dropdown, NumberField, TextField, toast } from '@/components/ui'
import { CURRENCY_DECIMALS, EVIDENCE_LABEL, PURCHASE_TYPE_LABEL, TODAY } from '@/domain/constants'
import { formatKRW, formatNumber, nowStamp } from '@/domain/format'
import { evaluateGates, riskOf } from '@/domain/gates'
import { can, permissionHint } from '@/domain/rules'
import { applySale, INCOTERMS, saleKrw, validateSale, type SaleDraft } from '@/domain/saleDraft'
import type { Currency, TaxTreatment } from '@/domain/types'
import { calcVat } from '@/domain/vat'
import { useCurrentUser, useData, useErpStore, useEvaluations } from '@/store'
import { CrossCheckPanel } from './CrossCheckPanel'
import { VehiclePicker } from './VehiclePicker'

const EMPTY: SaleDraft = {
  buyerId: null,
  currency: 'USD',
  amount: null,
  incoterms: 'FOB',
  taxTreatment: 'ZERO_RATED',
  customsBroker: null,
  expectedShipmentDate: '',
}

export function SalePage() {
  usePageTitle('판매 등록', '매입 확정 차량의 정보로 매입과 매출을 대조합니다.')
  const data = useData()
  const evals = useEvaluations()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const registerSale = useErpStore((s) => s.registerSale)

  const candidates = Object.values(data.vehicles).filter((v) => v.stage === 'PURCHASE_CONFIRMED')
  const initial = params.get('vehicleId')
  const [selectedId, setSelectedId] = useState<string | null>(candidates.some((v) => v.id === initial) ? initial : null)
  const [draft, setDraft] = useState<SaleDraft>(EMPTY)
  const update = (patch: Partial<SaleDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const vehicle = selectedId ? data.vehicles[selectedId] : undefined
  const purchase = selectedId ? data.purchases[selectedId] : undefined
  const buyer = draft.buyerId ? data.buyers[draft.buyerId] : undefined
  const krw = saleKrw(draft, data)

  // 판매 초안을 반영한 상태로 게이트 미리보기
  const preview = useMemo(() => {
    if (!selectedId) return undefined
    const db = applySale(data, selectedId, draft, 'SO-PREVIEW', user.id, nowStamp())
    // 판매가 입력 전에는 역마진(S5)을 판정하지 않는다
    const gates = evaluateGates(selectedId, db).filter((g) => !(g.code === 'S5' && !draft.amount))
    const vat = calcVat(db.purchases[selectedId], db.evidences.filter((e) => e.vehicleId === selectedId), db.policy)
    return { gates, risk: riskOf(gates), vat }
  }, [data, draft, selectedId, user.id])

  const invalid = validateSale(selectedId, draft, data)
  const allowed = can(user.role, 'REGISTER_SALE')
  const evidences = selectedId ? data.evidences.filter((e) => e.vehicleId === selectedId && e.status !== 'REJECTED') : []

  const submit = () => {
    const result = registerSale(selectedId, draft)
    if (!result.ok) {
      toast.error(result.reasons[0])
      return
    }
    toast.success('판매를 등록했습니다 · 수출 검증 대상에 추가됨')
    navigate(`/vehicles/${result.id}`)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
      <div className="flex flex-col gap-5">
        <Panel title="판매할 차량" actions={<span className="text-caption-md text-gray-70">매입 확정 {candidates.length}대</span>}>
          <VehiclePicker vehicles={candidates} data={data} evals={evals} selectedId={selectedId} onSelect={setSelectedId} />
        </Panel>

        {vehicle && purchase && (
          <Panel title="연결된 차량 · 매입 정보">
            <dl className="grid grid-cols-4 gap-4">
              <Field label="VIN">
                <span className="font-mono text-body-sm">{vehicle.vin}</span>
              </Field>
              <Field label="차량">
                {vehicle.plateNumber} · {vehicle.manufacturer} {vehicle.model}
              </Field>
              <Field label="매입">
                {formatKRW(purchase.amount)}
                <span className="block text-caption-sm text-gray-70">
                  {PURCHASE_TYPE_LABEL[purchase.purchaseType]} · {data.vendors[purchase.vendorId]?.name}
                </span>
              </Field>
              <Field label="매입 증빙">
                {evidences.length ? (
                  <span className="text-body-sm">
                    {evidences.map((e) => `${EVIDENCE_LABEL[e.kind]}${e.status === 'VERIFIED' ? '' : '(검증 대기)'}`).join(', ')}
                  </span>
                ) : (
                  <span className="text-orange-60">없음</span>
                )}
              </Field>
            </dl>
          </Panel>
        )}

        {!vehicle && (
          <div className="rounded-xl border border-dashed border-gray-40 px-5 py-10 text-center">
            <p className="text-body-md-m text-gray-80">위 목록에서 판매할 차량을 선택하세요.</p>
            <p className="mt-1 text-caption-md text-gray-70">선택한 차량의 매입 정보가 자동으로 연결되고, 판매 조건을 입력할 수 있습니다.</p>
          </div>
        )}

        {vehicle && (
          <Panel title="판매 조건">
            <div className="grid grid-cols-2 gap-4">
              <Dropdown
                size="sm"
                label="바이어"
                required
                value={draft.buyerId}
                onChange={(id) => update({ buyerId: id })}
                options={Object.values(data.buyers).map((b) => ({ value: b.id, label: `${b.name} (${b.country})` }))}
              />
              <TextField size="sm" label="수출국 · 도착항" readOnly value={buyer ? `${buyer.country} · ${buyer.port}` : ''} placeholder="바이어 선택 시 자동" />
              <Dropdown
                size="sm"
                label="통화"
                required
                value={draft.currency}
                onChange={(c) => update({ currency: c as Currency, amount: null })}
                options={(Object.keys(data.rates) as Currency[]).map((c) => ({ value: c, label: c }))}
              />
              <NumberField
                size="sm"
                label="판매가"
                required
                value={draft.amount}
                onChange={(n) => update({ amount: n })}
                decimals={CURRENCY_DECIMALS[draft.currency]}
                suffix={draft.currency}
                message={
                  draft.currency === 'KRW'
                    ? undefined
                    : `환율 ${formatNumber(data.rates[draft.currency])} (등록 시점 고정)${krw ? ` · ${formatKRW(krw)}` : ''}`
                }
              />
              <Dropdown
                size="sm"
                label="Incoterms"
                required
                value={draft.incoterms}
                onChange={(i) => update({ incoterms: i })}
                options={INCOTERMS.map((i) => ({ value: i, label: i }))}
              />
              <Dropdown
                size="sm"
                label="매출 처리"
                required
                value={draft.taxTreatment}
                onChange={(t) => update({ taxTreatment: t as TaxTreatment })}
                options={[
                  { value: 'ZERO_RATED', label: '영세율 (직수출)' },
                  { value: 'DOMESTIC', label: '국내 판매 (과세 10%)' },
                ]}
              />
              <Dropdown
                size="sm"
                label="관세사"
                placeholder="미지정 — 통관 정보 누락으로 판정"
                value={draft.customsBroker}
                onChange={(b) => update({ customsBroker: b })}
                options={data.brokers.map((b) => ({ value: b, label: b }))}
              />
              <TextField
                size="sm"
                type="date"
                label="예정 선적일"
                min={TODAY}
                value={draft.expectedShipmentDate}
                onChange={(e) => update({ expectedShipmentDate: e.target.value })}
              />
            </div>
          </Panel>
        )}
      </div>

      <div className="sticky top-21 flex flex-col gap-4">
        <CrossCheckPanel
          purchase={purchase}
          saleKrw={krw}
          taxTreatment={draft.taxTreatment}
          vat={preview?.vat}
          gates={preview?.gates ?? []}
          risk={preview?.risk}
        />
        <div className="flex flex-col gap-2">
          <Button size="lg" disabled={!allowed || invalid.length > 0} onClick={submit}>
            판매 등록
          </Button>
          {!allowed ? (
            <p className="text-caption-md text-gray-70">{permissionHint('REGISTER_SALE')}이 필요합니다.</p>
          ) : invalid.length > 0 ? (
            <p className="text-caption-md text-gray-70">필수 항목(*)을 모두 입력하면 등록할 수 있습니다.</p>
          ) : (
            <p className="text-caption-md text-gray-70">등록하면 수출 검증 대상에 추가되고, 보완 항목은 업무 현황에서 추적됩니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
