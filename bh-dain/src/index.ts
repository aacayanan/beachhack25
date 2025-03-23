//File: example/example-node.ts

import {z} from "zod";
import {defineDAINService, ToolConfig} from "@dainprotocol/service-sdk";
import {
    CardUIBuilder,
    TableUIBuilder,
    MapUIBuilder,
    LayoutUIBuilder, DainResponse,
} from "@dainprotocol/utils";
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gmepwebfralzzpsmazcg.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const port = Number(process.env.PORT) || 2022;

const createUserConfig: ToolConfig = {
    id: "create-user",
    name: "Create User",
    description: "Create a user in the database",
    input: z.object({
        id: z.number().describe("ID of the user"),
        name: z.string().describe("Name of the user"),
    })
        .describe("Input parameters for the user creation"),
    output: z.object({
        id: z.number(),
        name: z.string()
    }),
    handler: async ({ id, name }) => {
        const { data, error } = await supabase
            .from('userdata')
            .insert({ id, name })
            .select()
            .single();
        if (error) throw error;
        const cardUI = new CardUIBuilder()
            .title("User Created")
            .content(`Name ${data.name}`)
            .build()
        return {
            text: `User created: ${data.name}`,
            data: {
                id: data.id,
                name: data.name
            },
            ui: cardUI
        }
    }
}

const dainService = defineDAINService({
    metadata: {
        title: "Weather DAIN Service",
        description:
            "A DAIN service for current weather and forecasts using Open-Meteo API",
        version: "1.0.0",
        author: "Your Name",
        tags: ["weather", "forecast", "dain"],
        logo: "https://cdn-icons-png.flaticon.com/512/252/252035.png",
    },
    exampleQueries: [
        {
            category: "Weather",
            queries: [
                "What is the weather in Tokyo?",
                "What is the weather in San Francisco?",
                "What is the weather in London?",
            ],
        },
    ],
    identity: {
        apiKey: process.env.DAIN_API_KEY,
    },
    tools: [createUserConfig],
});

dainService.startNode({port: port}).then(({address}) => {
    console.log("Weather DAIN Service is running at :" + address().port);
});
