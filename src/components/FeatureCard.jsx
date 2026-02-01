export default function FeatureCard({ title, desc }) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  );
}
