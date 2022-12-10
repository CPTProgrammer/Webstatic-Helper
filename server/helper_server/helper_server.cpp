#define _CRT_SECURE_NO_WARNINGS

#include <iostream>
#include <dinput.h>
#include <dwmapi.h>
#include <stdio.h>

#pragma comment(lib, "dxguid.lib")
#pragma comment(lib, "dinput8.lib")

#define GET_MOUSE_POSITION 1
#define SET_MOUSE_POSITION_TO_ZERO 0

using namespace std;

// 思路（代码）来源于 MMmmmoko/Bongo-Cat-Mver 项目，感谢猫猫 ฅ^•ﻌ•^ฅ ！

HWND catHwnd;

HINSTANCE hInst;
LPDIRECTINPUT8 lpdi = NULL;
LPDIRECTINPUTDEVICE8 lpdimouse = NULL;
DIMOUSESTATE mouse_state_d7;
POINT point;

int DInput_Init_Mouse(void) {
    HRESULT hr;

    if (FAILED(::DirectInput8Create(hInst, DIRECTINPUT_VERSION, IID_IDirectInput8, (void**)&lpdi, NULL))) {
        return 0;
    }
    if (lpdi->CreateDevice(GUID_SysMouse, &lpdimouse, NULL) != DI_OK) {
        return 0;
    }
    if (lpdimouse->SetCooperativeLevel(catHwnd, DISCL_NONEXCLUSIVE | DISCL_BACKGROUND) != DI_OK) {
        return 0;
    }

    DIPROPDWORD property;
    
    property.diph.dwSize = sizeof(DIPROPDWORD);
    property.diph.dwHeaderSize = sizeof(DIPROPHEADER);
    property.diph.dwObj = 0;
    property.diph.dwHow = DIPH_DEVICE;
    property.dwData = 16;

    if (lpdimouse->SetDataFormat(&c_dfDIMouse) != DI_OK) {
        return 0;
    }

    hr = lpdimouse->SetProperty(DIPROP_BUFFERSIZE, &property.diph);

    if (FAILED(hr)) {
        return false;
    }

    if (lpdimouse->Acquire() != DI_OK) {
        return 0;
    }
}

int DInput_Read_Mouse(void) {
    if (lpdimouse) {
        if (lpdimouse->GetDeviceState(sizeof(DIMOUSESTATE), (LPVOID)&mouse_state_d7) != DI_OK) {
            return 0;
        }
    } else {
        memset(&mouse_state_d7, 0, sizeof(mouse_state_d7));
        return 0;
    }
    return 1;
}

void DInput_Release_Mouse(void) {
    if (lpdimouse) {
        lpdimouse->Unacquire();
        lpdimouse->Release();
    }
}

/*HRESULT UpdateInputState(void) {
    DWORD i;
    if (lpdimouse != NULL) {
        DIDEVICEOBJECTDATA didod;
        DWORD dwElements;
        HRESULT hr;
        while (true) {
            dwElements = 1;
            hr = lpdimouse->GetDeviceData(sizeof(DIDEVICEOBJECTDATA), &didod, &dwElements, 0);
            if (FAILED(hr)) {
                if (hr == DIERR_INPUTLOST) {
                    hr = lpdimouse->Acquire();
                    if (FAILED(hr)) {
                        return S_FALSE;
                    }
                }
            } else {
                if (dwElements == 1) {
                    switch (didod.dwOfs) {
                        case DIMOFS_X:
                            point.x += didod.dwData;
                            break;
                        case DIMOFS_Y:
                            point.y += didod.dwData;
                            break;
                        default:
                            break;
                    }
                } else if (dwElements == 0) {
                    break;
                }
            }
        }
    }
    return S_OK;
}*/


int main() {
    hInst = GetModuleHandle(0);
    DInput_Init_Mouse();

    short inputCode;

    printf("r\n");
    fflush(stdout);

    while (true) {
        scanf("%hd", &inputCode);
        switch (inputCode) {
            case GET_MOUSE_POSITION:
                DInput_Read_Mouse();
                point.x += mouse_state_d7.lX;
                point.y += mouse_state_d7.lY;
                //printf("{\"offsetX:\":%d,\"offsetY\":%d}\n", point.x, point.y);
                printf("%d %d\n", point.x, point.y);
                fflush(stdout);
                printf("!%d %d\n", mouse_state_d7.lX, mouse_state_d7.lY);
                fflush(stdout);
                break;
            case SET_MOUSE_POSITION_TO_ZERO:
                DInput_Read_Mouse();
                point.x = 0;
                point.y = 0;
                printf("s %d %d\n", point.x, point.y);
                fflush(stdout);
                break;
        }
    }
    return 0;
}