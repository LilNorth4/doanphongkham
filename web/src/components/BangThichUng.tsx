import { Card, Checkbox, Empty, Flex, Pagination, Spin, Table, Typography, theme, type TableProps } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { useEffect, useState, type Key, type ReactNode } from 'react'
import { useManHinhNho } from '@/hooks/manHinh'

type Props<T> = TableProps<T> & {
  /** Số cột đầu gộp làm tiêu đề thẻ trên điện thoại (VD giờ + tên bệnh nhân). Mặc định 1. */
  soCotTieuDe?: number
  /** Cột thao tác gọn (VD nút ⋮) đặt ở góc phải tiêu đề thẻ thay vì một dòng riêng cuối thẻ. */
  thaoTacTrenDau?: boolean
}

const KEY_THAO_TAC = ['tac', 'thao_tac', 'thao-tac']

/**
 * Bảng trên máy tính, danh sách thẻ trên điện thoại, dùng chung khai báo cột của Table:
 * cột đầu làm tiêu đề thẻ, cột thao tác (fixed right hoặc key 'thao_tac') xuống cuối thẻ,
 * các cột còn lại thành dòng "nhãn: giá trị". Cột ẩn theo responsive vẫn hiện trong thẻ.
 */
export default function BangThichUng<T extends object>({ soCotTieuDe = 1, thaoTacTrenDau, ...props }: Props<T>) {
  const nho = useManHinhNho()
  const { token } = theme.useToken()
  const pg = typeof props.pagination === 'object' ? props.pagination : {}
  const coPhanTrang = props.pagination !== false
  const kichThuoc = pg.pageSize ?? 10
  const [trang, setTrang] = useState(1)
  const ds = (props.dataSource ?? []) as T[]

  // Dữ liệu đổi (lọc, tải lại) mà trang hiện tại vượt quá số trang thì quay về trang 1
  useEffect(() => {
    if ((trang - 1) * kichThuoc >= ds.length) setTrang(1)
  }, [ds.length, kichThuoc, trang])

  if (!nho) return <Table<T> {...props} />

  const cot = ((props.columns ?? []) as ColumnType<T>[]).filter((c) => !('children' in c))
  const laThaoTac = (c: ColumnType<T>) => c.fixed === 'right' || KEY_THAO_TAC.includes(String(c.key))
  const cotTieuDe = cot.filter((c) => !laThaoTac(c)).slice(0, soCotTieuDe)
  const cotThan = cot.filter((c) => !laThaoTac(c) && !cotTieuDe.includes(c))
  const cotTac = cot.filter(laThaoTac)

  const khoa = (r: T, i: number): Key => {
    const rk = props.rowKey
    if (typeof rk === 'function') return rk(r, i)
    return (r as Record<string, Key>)[rk ?? 'key'] ?? i
  }
  const o = (c: ColumnType<T>, r: T, i: number): ReactNode => {
    const di = c.dataIndex
    const gt = Array.isArray(di)
      ? di.reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], r)
      : di !== undefined ? (r as Record<string, unknown>)[di as string] : undefined
    return (c.render ? c.render(gt, r, i) : gt) as ReactNode
  }

  const chonHang = props.rowSelection
  const daChon = new Set(chonHang?.selectedRowKeys ?? [])
  const datChon = (keys: Key[]) => chonHang?.onChange?.(keys, ds.filter((r, i) => keys.includes(khoa(r, i))),
    { type: 'multiple' })

  const batDau = coPhanTrang ? (trang - 1) * kichThuoc : 0
  const hien = coPhanTrang ? ds.slice(batDau, batDau + kichThuoc) : ds
  const anPhanTrang = !coPhanTrang || (pg.hideOnSinglePage && ds.length <= kichThuoc)
  const tatCa = ds.map((r, i) => khoa(r, i))
  const rong = props.locale?.emptyText

  return (
    <Spin spinning={!!props.loading}>
      {chonHang && ds.length > 0 && (
        <Checkbox style={{ marginBottom: 8 }}
          checked={daChon.size > 0 && daChon.size === ds.length}
          indeterminate={daChon.size > 0 && daChon.size < ds.length}
          onChange={(e) => datChon(e.target.checked ? tatCa : [])}>
          Chọn tất cả ({ds.length})
        </Checkbox>
      )}
      {ds.length === 0 ? (
        <div style={{ padding: '24px 0' }}>
          {(typeof rong === 'function' ? rong() : rong) ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </div>
      ) : (
        <Flex vertical gap={10}>
          {hien.map((r, j) => {
            const i = batDau + j
            const k = khoa(r, i)
            return (
              <Card key={k} size="small"
                style={daChon.has(k) ? { borderColor: token.colorPrimary, background: token.colorPrimaryBg } : undefined}>
                <Flex gap={10} align="flex-start">
                  {chonHang && (
                    <Checkbox checked={daChon.has(k)} style={{ marginTop: 2 }}
                      onChange={(e) => datChon(e.target.checked ? [...daChon, k] : [...daChon].filter((x) => x !== k))} />
                  )}
                  <Flex wrap gap="4px 12px" align="center" style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
                    {cotTieuDe.map((c, x) => <div key={x} style={{ minWidth: 0 }}>{o(c, r, i)}</div>)}
                  </Flex>
                  {thaoTacTrenDau && cotTac.map((c, x) => <div key={x} style={{ flex: 'none' }}>{o(c, r, i)}</div>)}
                </Flex>
                {cotThan.length > 0 && (
                  <Flex vertical gap={4} style={{ marginTop: 8 }}>
                    {cotThan.map((c, x) => (
                      <Flex key={x} gap={8} align="baseline">
                        <Typography.Text type="secondary" style={{ flex: 'none', width: 104, fontSize: 13 }}>
                          {c.title as ReactNode}
                        </Typography.Text>
                        <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{o(c, r, i)}</div>
                      </Flex>
                    ))}
                  </Flex>
                )}
                {!thaoTacTrenDau && cotTac.length > 0 && (
                  <Flex justify="flex-end" wrap gap={8}
                    style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    {cotTac.map((c, x) => <div key={x}>{o(c, r, i)}</div>)}
                  </Flex>
                )}
              </Card>
            )
          })}
        </Flex>
      )}
      {!anPhanTrang && ds.length > 0 && (
        <Flex justify="center" style={{ marginTop: 12 }}>
          <Pagination simple current={trang} pageSize={kichThuoc} total={ds.length} onChange={setTrang}
            showTotal={pg.showTotal} />
        </Flex>
      )}
    </Spin>
  )
}
