import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SettingsScreen() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/perfil', { replace: true }) }, [navigate])
  return null
}
