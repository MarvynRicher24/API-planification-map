import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './Sidebar';
import MapView from './MapView';

function App() {
  const [baseAddress, setBaseAddress] = useState(() => {
    const saved = localStorage.getItem('baseAddress');
    return saved ? JSON.parse(saved) : null;
  });
  const [followingAddresses, setFollowingAddresses] = useState(() => {
    const saved = localStorage.getItem('followingAddresses');
    return saved ? JSON.parse(saved) : [];
  });
  const [vehicle, setVehicle] = useState(() => localStorage.getItem('vehicle') || 'chooseYourVehicle');
  const [route, setRoute] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [carbonFootprint, setCarbonFootprint] = useState(0);

  const vehicleData = useMemo(() => ({
    car: { speed: 60, emission: 218 },
    electricCar: { speed: 60, emission: 103 },
    utility: { speed: 60, emission: 218 },
    electricUtility: { speed: 60, emission: 103 },
    byFoot: { speed: 5, emission: 0 },
    bike: { speed: 15, emission: 6 },
  }), []);

  useEffect(() => {
    localStorage.setItem('vehicle', vehicle);
  }, [vehicle]);

  useEffect(() => {
    if (baseAddress) localStorage.setItem('baseAddress', JSON.stringify(baseAddress));
    else localStorage.removeItem('baseAddress');
  }, [baseAddress]);

  useEffect(() => {
    localStorage.setItem('followingAddresses', JSON.stringify(followingAddresses));
  }, [followingAddresses]);

  useEffect(() => {
    const fetchRouteData = async () => {
      if (!baseAddress) {
        setRoute(null);
        setTotalDistance(0);
        setTotalTime(0);
        setCarbonFootprint(0);
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/calculate-route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseAddress, followingAddresses, vehicle }),
        });
        const data = await response.json();

        if (data && data.optimizedPoints) {
          setRoute({ geometry: null, optimizedPoints: data.optimizedPoints });
          setTotalDistance((data.totalDistance / 1000).toFixed(2));
          const footprint = (data.totalDistance / 1000) * vehicleData[vehicle].emission;
          setCarbonFootprint(footprint.toFixed(2));
          setTotalTime(Math.floor((data.totalDistance / 1000) / vehicleData[vehicle].speed * 60));
        }
      } catch (error) {
        console.error('Error fetching route data:', error);
      }
    };

    fetchRouteData();
  }, [baseAddress, followingAddresses, vehicle, vehicleData]);

  return (
    <div className="app-container">
      <Sidebar
        vehicle={vehicle}
        setVehicle={setVehicle}
        baseAddress={baseAddress}
        setBaseAddress={setBaseAddress}
        followingAddresses={followingAddresses}
        setFollowingAddresses={setFollowingAddresses}
        totalEntries={baseAddress ? 1 + followingAddresses.length : 0}
        totalDistance={totalDistance}
        totalTime={totalTime}
        carbonFootprint={carbonFootprint}
      />
      <MapView route={route} />
    </div>
  );
}

export default App;