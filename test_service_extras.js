// Test script to verify service extras functionality
const testServiceCreation = async () => {
  const serviceData = {
    customerId: 5,
    vehicleId: 4,
    serviceTypeId: 5, // Ar Condicionado - R$ 150
    technicianId: 1,
    estimatedValue: 230, // R$ 150 (base) + R$ 80 (adicional)
    valorPago: "0",
    serviceExtras: [
      {
        serviceExtraId: 8, // Higienização
        valor: "80.00",
        observacao: "Adicional de higienização"
      }
    ]
  };

  console.log('Testing service creation with extras:', JSON.stringify(serviceData, null, 2));

  try {
    const response = await fetch('http://localhost:5000/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-id' // You'll need to get this from browser
      },
      body: JSON.stringify(serviceData)
    });

    const result = await response.json();
    console.log('Service creation result:', result);

    if (response.ok) {
      // Test fetching the service extras
      const extrasResponse = await fetch(`http://localhost:5000/api/services/${result.id}/extras`, {
        headers: {
          'Cookie': 'connect.sid=your-session-id'
        }
      });
      
      const extras = await extrasResponse.json();
      console.log('Service extras retrieved:', extras);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testServiceCreation();