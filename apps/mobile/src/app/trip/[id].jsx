import ScaffoldScreen from '../../components/common/scaffold-screen.jsx';

export default function TripDetailScreen() {
  return (
    <ScaffoldScreen
      description="Saved trip details will appear here after the mobile trip-detail flow is connected to the authenticated trips API. This screen does not claim that a trip has been loaded yet."
      eyebrow="Trip"
      title="Trip details are not connected yet"
    />
  );
}
