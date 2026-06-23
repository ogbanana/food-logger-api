export default function Spinner({
  size = 20,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <span
      className="spinner"
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 10)),
        color,
      }}
    />
  );
}
