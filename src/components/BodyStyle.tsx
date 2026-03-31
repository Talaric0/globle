export default function BodyStyle() {
  const brandBg = {
    background: "var(--color-bg-surface-secondary)",
    margin: 0,
  };

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0">
      <div
        style={brandBg}
        className="absolute top-0 bottom-0 left-0 right-0 block z-0 h-full"
      ></div>
    </div>
  );
}
