'use client'

import { useEffect, useRef } from 'react';
import { init, type WalineInstance, type WalineInitOptions } from '@waline/client';
import '@waline/client/style';

export type WalineOptions = Omit<WalineInitOptions, 'el'>;

const WalineComment = (props: WalineOptions) => {
  // Return null to disable comments entirely
  return null;
};

export default WalineComment;