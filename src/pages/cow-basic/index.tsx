import type { CowBasic } from "../../types/dashboard";

type CowBasicPageProps = {
  cows: CowBasic[];
  keyword: string;
  onKeywordChange: (keyword: string) => void;
};

export function CowBasicPage({ cows, keyword, onKeywordChange }: CowBasicPageProps) {
  const filteredCows = cows.filter((cow) => cow.cowNo.toLowerCase().includes(keyword.trim().toLowerCase()));

  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_basic</p>
          <h2>牛只基础档案</h2>
        </div>
        <label className="search-field">
          <span>牛编号</span>
          <input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="输入 cow_no" />
        </label>
      </section>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>牛编号</th>
                <th>栏位</th>
                <th>品种</th>
                <th>性别</th>
                <th>月龄</th>
                <th>体重</th>
                <th>状态</th>
                <th>最近采集</th>
              </tr>
            </thead>
            <tbody>
              {filteredCows.map((cow) => (
                <tr key={cow.cowNo}>
                  <td>
                    <strong>{cow.cowNo}</strong>
                  </td>
                  <td>{cow.pen}</td>
                  <td>{cow.breed}</td>
                  <td>{cow.gender}</td>
                  <td>{cow.ageMonth} 月</td>
                  <td>{cow.weightKg} kg</td>
                  <td>{cow.status}</td>
                  <td>{cow.lastCollectedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
