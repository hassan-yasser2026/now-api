import * as React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export type MapMarker = {
  lat: number;
  lng: number;
  label?: string;
  color?: 'primary' | 'success' | 'blue';
};

export type LocationMapHandle = {
  setPick: (lat: number, lng: number) => void;
};

export type LocationMapProps = {
  markers?: MapMarker[];
  center?: { lat: number; lng: number } | null;
  zoom?: number;
  picker?: boolean;
  onPick?: (point: { lat: number; lng: number }) => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  mapRef?: React.MutableRefObject<LocationMapHandle | null>;
};

declare const LocationMap: React.FC<LocationMapProps>;

export default LocationMap;
