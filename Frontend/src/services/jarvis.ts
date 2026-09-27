import { apiFetch } from './api'

export type JarvisResponse = {
    response: string
}

export async function sendMessageToJarvis(
    message: string,
): Promise<JarvisResponse> {
    const response = await apiFetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to communicate with Jarvis')
    }

    return response.json()
}
