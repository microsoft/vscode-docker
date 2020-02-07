/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PythonProjectType } from '../debugging/python/PythonDebugHelper';
import { Platform } from './platform';

export function inferArgs(projectType: PythonProjectType, ports: number[]): string[] | undefined {
    switch (projectType) {
      case 'django':
        return [
          "runserver",
          `0.0.0.0:${ports !== undefined ? ports[0] : 8000}`,
          "--nothreading",
          "--noreload"
        ];
      default:
        return undefined;
    }
  }

  export function getPythonProjectType(platform: Platform): PythonProjectType | undefined {
    switch (platform) {
      case 'Python: Django':
        return "django";
      case 'Python: Flask':
        return "flask";
      case 'Python: General':
        return "general";
      default:
        return undefined;
    }
  }
