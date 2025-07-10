export const vehicleBrands = [
  "Chevrolet",
  "Volkswagen",
  "Fiat",
  "Ford",
  "Toyota",
  "Honda",
  "Hyundai",
  "Nissan",
  "Renault",
  "Peugeot",
  "Citroën",
  "Jeep",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Mitsubishi",
  "Kia",
  "Suzuki",
  "Subaru",
  "Land Rover",
  "Volvo",
  "Chery",
  "JAC",
  "Caoa Chery",
  "GWM",
  "BYD"
];

export const vehicleModels = {
  "Chevrolet": [
    "Onix", "Prisma", "Cruze", "Tracker", "Equinox", "S10", "Spin", "Cobalt",
    "Sonic", "Agile", "Celta", "Classic", "Corsa", "Meriva", "Montana",
    "Astra", "Vectra", "Zafira", "Captiva", "Trailblazer"
  ],
  "Volkswagen": [
    "Gol", "Voyage", "Polo", "Virtus", "T-Cross", "Nivus", "Tiguan", "Amarok",
    "Fox", "CrossFox", "SpaceFox", "Golf", "Jetta", "Passat", "Touareg",
    "Up!", "Saveiro", "Kombi", "Parati", "Santana"
  ],
  "Fiat": [
    "Argo", "Cronos", "Mobi", "Uno", "Strada", "Toro", "Pulse", "Fastback",
    "Palio", "Siena", "Punto", "Linea", "Bravo", "Idea", "Doblò", "Fiorino",
    "Ducato", "500", "Panda", "Marea"
  ],
  "Ford": [
    "Ka", "Ka Sedan", "EcoSport", "Territory", "Ranger", "Edge", "Mustang",
    "Fiesta", "Focus", "Fusion", "Explorer", "F-150", "Transit", "Courier",
    "Escort", "Mondeo", "Maverick", "Belina"
  ],
  "Toyota": [
    "Corolla", "Yaris", "Etios", "RAV4", "Hilux", "SW4", "Prius", "Camry",
    "Fielder", "Bandeirante", "Land Cruiser", "Prado", "Avalon", "Highlander",
    "4Runner", "Tacoma", "Tundra", "Sienna"
  ],
  "Honda": [
    "City", "Civic", "Accord", "HR-V", "CR-V", "Pilot", "Fit", "WR-V",
    "Ridgeline", "Passport", "Odyssey", "Insight", "Clarity", "Element",
    "S2000", "NSX", "Del Sol", "Prelude"
  ],
  "BYD": [
    "Dolphin", "Seal", "Atto 3", "Han", "Tang", "Song", "Yuan", "Qin",
    "E2", "E3", "King", "F3", "G3", "S6", "S7", "Flyer"
  ]
};

export const vehicleYears = Array.from({ length: 25 }, (_, i) => (new Date().getFullYear() - i).toString());

export const vehicleColors = [
  "Branco",
  "Preto",
  "Prata",
  "Cinza",
  "Vermelho",
  "Azul",
  "Verde",
  "Amarelo",
  "Bege",
  "Marrom",
  "Rosa",
  "Laranja",
  "Roxo",
  "Dourado",
  "Bronze"
];

export const fuelTypes = [
  { value: "gasoline", label: "Gasolina" },
  { value: "ethanol", label: "Etanol" },
  { value: "flex", label: "Flex" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Elétrico" },
  { value: "hybrid", label: "Híbrido" },
  { value: "gnv", label: "GNV" }
];

// Função para mostrar notificação de sucesso animada
export function showVehicleNotification(vehicleBrand: string, vehicleModel: string) {
  // Criar elemento da notificação
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-xl shadow-2xl z-50 transform translate-x-full transition-all duration-500 ease-out max-w-sm';
  notification.innerHTML = `
    <div class="flex items-center space-x-3">
      <div class="bg-white/20 p-2 rounded-lg">
        <span class="text-xl">🚗</span>
      </div>
      <div>
        <p class="font-semibold">Novo veículo cadastrado!</p>
        <p class="text-sm opacity-90">${vehicleBrand} ${vehicleModel}</p>
      </div>
      <div class="ml-auto">
        <span class="text-xl">✨</span>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Animar entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Animar saída
  setTimeout(() => {
    notification.style.transform = 'translateX(full)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 4000);
}

// Função para confetes animados
export function showCelebration() {
  const colors = ['#10B981', '#06D6A0', '#118AB2', '#073B4C', '#FFD23F'];
  const confettiCount = 50;

  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.style.zIndex = '9999';
      confetti.style.pointerEvents = 'none';
      confetti.style.transition = 'all 3s ease-out';

      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.style.top = '100vh';
        confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
        confetti.style.opacity = '0';
      }, 50);

      setTimeout(() => {
        if (document.body.contains(confetti)) {
          document.body.removeChild(confetti);
        }
      }, 3000);
    }, i * 50);
  }
}

export function searchVehicleBrands(query: string): string[] {
  if (!query) return vehicleBrands;
  return vehicleBrands.filter(brand => 
    brand.toLowerCase().includes(query.toLowerCase())
  );
}

export function searchVehicleModels(brand: string, query: string): string[] {
  const models = vehicleModels[brand] || [];
  if (!query) return models;
  return models.filter(model => 
    model.toLowerCase().includes(query.toLowerCase())
  );
}