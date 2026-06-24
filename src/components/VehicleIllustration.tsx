import React from 'react'
import type { TipoVeiculo } from '@/lib/types'

const VEHICLE_SVG: Record<TipoVeiculo, string> = {
  CARRO:            '/vehicles/ic_carro.svg',
  HATCH:            '/vehicles/hatch.svg',
  SUV:              '/vehicles/suv.svg',
  MOTO:             '/vehicles/ic_moto.svg',
  CAMINHONETE:      '/vehicles/ic_camionete.svg',
  VAN:              '/vehicles/newvan.svg',
  FURGAO:           '/vehicles/van.svg',
  CAMINHAO:         '/vehicles/ic_caminhao.svg',
  ONIBUS:           '/vehicles/onibus.svg',
  BICICLETA:        '/vehicles/bikenova.svg',
  BIKE_ELETRICA:    '/vehicles/bikeeletrica.svg',
  VEICULO_ELETRICO: '/vehicles/carroeletrico.svg',
  CARRETINHA:       '/vehicles/ic_carreta.svg',
  MOTORHOME:        '/vehicles/motorhome.svg',
  TRATOR:           '/vehicles/ic_trator.svg',
}

interface Props {
  tipo: TipoVeiculo
  className?: string
  style?: React.CSSProperties
}

export function VehicleIllustration({ tipo, className = '', style }: Props) {
  const src = VEHICLE_SVG[tipo] ?? VEHICLE_SVG.CARRO
  return (
    <img
      src={src}
      alt={tipo}
      className={className}
      style={{ filter: 'brightness(0) invert(1)', ...style }}
      draggable={false}
    />
  )
}
