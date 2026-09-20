import ScaffoldScreen from '../../components/common/scaffold-screen.jsx';

export default function NearbyScreen() {
  return (
    <ScaffoldScreen
      description="Nearby recommendations will use permission aware location access and remain useful when location or provider services are unavailable."
      eyebrow="Around you"
      title="Useful places, safely nearby"
    />
  );
}
