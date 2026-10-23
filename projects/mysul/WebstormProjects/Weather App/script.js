async function getWeather() {
    const city = document.getElementById('cityInput').value;
    const apiKey = 'Your_API_Key';
    const utl = 'https://';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error ('City not found');
        }
        const data = await response.json();
        displayWeather(data);
    } catch (error) {
        document.getElementById('weather').innerHTML = `<p>${error.message}</p>`
    }
}

function displayWeather(data) {
    const weatherDiv = document.getElementById('weather');
    weatherDiv.innerHTML = `<h2>${data.name}, ${data.sys.country}</h2>
    <p>Temperature: ${data.main.temp}°C</p>
    <p>Weather: ${data.weather[O].main}</p>
    <p>Humidity: ${data.main.humidity}%</p>
    <p>Wind Speed: ${data.wind.speed} m/s</p>`;
}

//Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('click', () =>{
    document.body.classList.toggle('dark-mode');
});