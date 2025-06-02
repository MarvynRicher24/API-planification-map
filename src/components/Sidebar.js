import React, { useState } from 'react';
import AddressAutocomplete from './AddressAutocomplete';
import CustomSelect from './CustomSelect';

const Sidebar = ({
  vehicle,
  setVehicle,
  baseAddress,
  setBaseAddress,
  followingAddresses,
  setFollowingAddresses,
  totalEntries,
  totalDistance,
  totalTime,
  carbonFootprint,
}) => {
  const [gpsUsed, setGpsUsed] = useState(false); // Utilisé pour le style du bouton GPS

  const entriesComplete = baseAddress && followingAddresses.length > 0;
  const vehicleSelected = vehicle !== 'chooseYourVehicle';

  const handleBaseSelect = (selected) => {
    setBaseAddress(selected);
  };

  const handleFollowingSelect = (selected) => {
    setFollowingAddresses([...followingAddresses, selected]);
  };

  const handleDeleteFollowing = (index) => {
    const updated = followingAddresses.filter((_, i) => i !== index);
    setFollowingAddresses(updated);
  };

  const handleDeleteBase = () => {
    setBaseAddress(null);
    setGpsUsed(false);
  };

  const handleUseGpsCoordinates = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/geocode-address`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${latitude},${longitude}` }),
          });
          const data = await response.json();
          if (data) {
            setBaseAddress({
              address: data.address,
              lat: data.lat,
              lon: data.lon,
            });
            setGpsUsed(true);
          }
        } catch (error) {
          console.error('Error during reverse geocoding:', error);
        }
      });
    }
  };

  const handleExportGoogle = () => {
    if (!entriesComplete || !vehicleSelected) {
      alert('Please complete entries before export');
      return;
    }
    const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${baseAddress.lat},${baseAddress.lon}&destination=${followingAddresses[followingAddresses.length - 1].lat},${followingAddresses[followingAddresses.length - 1].lon}`;
    window.open(googleUrl, '_blank', 'noopener');
  };

  const handleDownloadGPX = async () => {
    if (!entriesComplete || !vehicleSelected) {
      alert('Please complete entries before downloading');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/export-gpx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseAddress, followingAddresses, vehicle }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'route.gpx');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting GPX:', error);
    }
  };

  const handleResetItinerary = () => {
    setBaseAddress(null);
    setFollowingAddresses([]);
    setVehicle('chooseYourVehicle');
    localStorage.removeItem('baseAddress');
    localStorage.removeItem('followingAddresses');
    localStorage.removeItem('vehicle');
    setGpsUsed(false);
  };

  return (
    <div className="sidebar">
      <div className="zoneTitle">
        <h1 id="title">FastPlaneco</h1>
      </div>

      <div className="zoneChooseYourVehicle">
        <CustomSelect
          value={vehicle}
          onChange={setVehicle}
          options={[
            { value: 'car', label: 'Car' },
            { value: 'electricCar', label: 'Electric Car' },
            { value: 'utility', label: 'Utility' },
            { value: 'electricUtility', label: 'Electric Utility' },
            { value: 'bike', label: 'Bike' },
            { value: 'byFoot', label: 'By Foot' },
          ]}
          placeholder="Choose your vehicle"
        />
      </div>

      <div className="zoneBaseAddress">
        <AddressAutocomplete placeholder="Enter your base address" onSelect={handleBaseSelect} />
        <button
          className="gpsCoordinatesButton"
          onClick={handleUseGpsCoordinates}
          style={gpsUsed ? { border: '2px solid green' } : {}}
        >
          Use GPS Coordinates
        </button>
        {baseAddress && (
          <div className="entryBaseAddress">
            <span>{baseAddress.address}</span>
            <button className="deleteButton" onClick={handleDeleteBase}>
              ×
            </button>
          </div>
        )}
      </div>

      <div className="zoneSecondAddress">
        <AddressAutocomplete placeholder="Enter following address" onSelect={handleFollowingSelect} />
        {followingAddresses.map((addr, index) => (
          <div key={index} className="entrySecondAddress">
            <span>{addr.address}</span>
            <button className="deleteButton" onClick={() => handleDeleteFollowing(index)}>
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="zoneInformation">
        <p>Total Entries: {totalEntries}</p>
        <p>Total Distance: {totalDistance} km</p>
        <p>Total Time: {totalTime} min</p>
        <p>Carbon Footprint: {carbonFootprint} g CO₂</p>
      </div>

      <button className="exportButton" onClick={handleExportGoogle}>
        Export to Google Maps
      </button>
      <button className="downloadButton" onClick={handleDownloadGPX}>
        Download GPX
      </button>
      <button className="resetButton" onClick={handleResetItinerary}>
        Reset Itinerary
      </button>
    </div>
  );
};

export default Sidebar;