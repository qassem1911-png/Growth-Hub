import { NextRequest, NextResponse } from 'next/server'

function getWeatherCondition(code: number): { desc: string; emoji: string } {
  if (code === 0) return { desc: 'Clear sky', emoji: '☀️' }
  if (code >= 1 && code <= 3) return { desc: 'Partly cloudy', emoji: '🌤️' }
  if (code === 45 || code === 48) return { desc: 'Foggy', emoji: '🌫️' }
  if (code >= 51 && code <= 55) return { desc: 'Drizzle', emoji: '🌧️' }
  if (code >= 61 && code <= 65) return { desc: 'Rainy', emoji: '🌧️' }
  if (code >= 71 && code <= 75) return { desc: 'Snowy', emoji: '❄️' }
  if (code >= 80 && code <= 82) return { desc: 'Rain showers', emoji: '🌦️' }
  if (code >= 95) return { desc: 'Thunderstorm', emoji: '⛈️' }
  return { desc: 'Cloudy', emoji: '☁️' }
}

interface CacheEntry {
  temp: number
  emoji: string
  messageAr: string
  messageEn: string
  timestamp: number
}

const weatherCache = new Map<string, CacheEntry>()
const CACHE_TTL = 7200000 // 2 hours strictly

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // Default fallback static messages
  const fallbackResponse = {
    temp: 24,
    emoji: '☀️',
    messageAr: 'الجو حلو النهاردة، فرصة ممتازة تخلص اللي وراك!',
    messageEn: 'Nice weather today—perfect time to get things done!'
  }

  let rawLat = 31.2001
  let rawLon = 29.9187
  try {
    const latParam = searchParams.get('lat')
    const lonParam = searchParams.get('lon')
    if (latParam) rawLat = parseFloat(latParam)
    if (lonParam) rawLon = parseFloat(lonParam)
    if (isNaN(rawLat)) rawLat = 31.2001
    if (isNaN(rawLon)) rawLon = 29.9187
  } catch (e) {
    console.error('Error parsing lat/lon:', e)
  }

  const latRounded = Math.round(rawLat * 10) / 10
  const lonRounded = Math.round(rawLon * 10) / 10
  const cacheKey = `${latRounded}_${lonRounded}`
  const now = Date.now()

  try {
    // Check in-memory cache hit
    const cached = weatherCache.get(cacheKey)
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      console.log(`WEATHER_CACHE_HIT for key: ${cacheKey}`)
      return NextResponse.json({
        temp: cached.temp,
        emoji: cached.emoji,
        messageAr: cached.messageAr,
        messageEn: cached.messageEn
      })
    }
    
    console.log(`WEATHER_CACHE_MISS for key: ${cacheKey}`)

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${rawLat}&longitude=${rawLon}&current_weather=true`
    const weatherRes = await fetch(weatherUrl, { next: { revalidate: 7200 } })
    
    if (!weatherRes.ok) {
      throw new Error(`Weather API returned status ${weatherRes.status}`)
    }

    const weatherData = await weatherRes.json()
    const current = weatherData?.current_weather
    if (!current) {
      throw new Error('No current weather data found in Open-Meteo response')
    }

    const temp = Math.round(current.temperature)
    const code = current.weathercode
    const condition = getWeatherCondition(code)

    // SMART SYSTEM: Instantly compile high-quality atmospheric greetings locally without blocking API requests!
    let messageAr = 'الجو حلو النهاردة، فرصة ممتازة تخلص اللي وراك!'
    let messageEn = 'Nice weather today—perfect time to get things done!'

    if (code === 0) { // Clear sky
      if (temp > 30) {
        messageAr = 'الجو حر النهاردة، كوباية ماية متلجة وركز في مهمتك!'
        messageEn = 'Hot out there! Grab some ice water and tackle your missions.'
      } else {
        messageAr = 'الجو مشمس وجميل، أنسب وقت تحقق فيه أهدافك!'
        messageEn = 'Sunny and beautiful—prime time to make progress today!'
      }
    } else if (code >= 1 && code <= 3) { // Partly cloudy
      messageAr = 'جو غيوم خفيف ولطيف، ركز وخلص أهداف النهاردة!'
      messageEn = 'Pleasant overcast skies. Let\'s crush today\'s objectives!'
    } else if (code === 45 || code === 48) { // Foggy
      messageAr = 'الجو ضباب برة، خلي تركيزك جوه الهاب مية في المية!'
      messageEn = 'Foggy outside. Keep your focus razor-sharp inside the Hub!'
    } else if ((code >= 51 && code <= 55) || (code >= 80 && code <= 82)) { // Drizzle/Showers
      messageAr = 'مطرة خفيفة بتشجع على التخطيط، كوباية شاي وركز!'
      messageEn = 'Light rain is great for focus. Sip tea and get to work!'
    } else if (code >= 61 && code <= 65) { // Rainy
      messageAr = 'صوت المطر برة مريح للأعصاب، أنسب وقت للتركيز العميق!'
      messageEn = 'The sound of rain is perfect for deep work. Let\'s build!'
    } else if (code >= 71 && code <= 75) { // Snowy
      messageAr = 'الجو برد وتلج، خليك دافي وركز في مشاريعك!'
      messageEn = 'Cold out there! Stay warm and make significant progress.'
    } else if (code >= 95) { // Thunderstorm
      messageAr = 'عاصفة ورعد برة؟ أحسن وقت تقعد في هدوء وتخلص اللي وراك!'
      messageEn = 'Stormy weather outside. The perfect excuse to stay in and focus.'
    } else { // Generic Cloudy
      messageAr = 'الجو هادي ومناسب للشغل الرايق، ابدأ فوراً!'
      messageEn = 'Calm sky today—perfect setting for some clean progress!'
    }

    const successResponse = {
      temp,
      emoji: condition.emoji,
      messageAr,
      messageEn
    }

    // Set cache entry
    weatherCache.set(cacheKey, {
      ...successResponse,
      timestamp: now
    })

    return NextResponse.json(successResponse)
  } catch (error) {
    console.error('WEATHER_API_ROUTE_ERROR:', error)
    return NextResponse.json(fallbackResponse)
  }
}
