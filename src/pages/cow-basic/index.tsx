import type { CowBasic } from "../../types/dashboard";

type CowBasicPageProps = {
  cows: CowBasic[];
  keyword: string;
  onKeywordChange: (keyword: string) => void;
};

export function CowBasicPage({ cows, keyword, onKeywordChange }: CowBasicPageProps) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredCows = cows.filter((cow) =>
    [cow.cowNo, cow.cowName, cow.farmName, cow.penNo, cow.breed]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedKeyword)),
  );

  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_basic</p>
          <h2>牛只基础档案</h2>
        </div>
        <label className="search-field">
          <span>档案检索</span>
          <input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="牛编号 / 名称 / 栏位" />
        </label>
      </section>

      {filteredCows.length > 0 ? (
        <section className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>牛编号</th>
                  <th>牛只名称</th>
                  <th>养殖场</th>
                  <th>栏位</th>
                  <th>品种</th>
                  <th>性别</th>
                  <th>出生日期</th>
                  <th>状态</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {filteredCows.map((cow) => (
                  <tr key={cow.cowNo}>
                    <td>
                      <strong>{cow.cowNo}</strong>
                    </td>
                    <td>{cow.cowName || "-"}</td>
                    <td>{cow.farmName || "-"}</td>
                    <td>{cow.penNo || "-"}</td>
                    <td>{cow.breed || "-"}</td>
                    <td>{cow.gender}</td>
                    <td>{cow.birthDate || "-"}</td>
                    <td>{cow.status}</td>
                    <td>{cow.remark || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel state-block compact-empty-state">
          <div className="state-glyph" />
          <h2>暂无牛只数据</h2>
          <p>没有查询到牛只基础档案。</p>
        </section>
      )}
    </div>
  );
}
