export default function PhotoSortScreen({ config }) {
  return (
    <div className="photo-sort-screen">
      <h1>Photo Sorter</h1>
      <p>Configuration loaded:</p>
      <pre>{JSON.stringify(config, null, 2)}</pre>
      <p>This screen will display photos for sorting in the next phase.</p>
    </div>
  );
}