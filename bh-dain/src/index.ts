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

const createEmployeeConfig: ToolConfig = {
    id: "create-employee",
    name: "Create Employee",
    description: "Create a user in the employee schedule",
    input: z.object({
        id: z.number().describe("ID of the employee"),
        name: z.string().describe("Name of the employee"),
    })
        .describe("Input parameters for the employee creation"),
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

const removeEmployeeConfig: ToolConfig = {
    id: "remove-employee",
    name: "Remove Employee",
    description: "Remove a user from the schedule",
    input: z.object({
        name: z.string().describe("Name of the employee"),
        id: z.number().optional().describe("ID of the employee"),
    }).describe("Input parameters for the employee removal"),
    output: z.object({
        id: z.number(),
        name: z.string()
    }),
    handler: async ({ name, id }) => {
        const { data, error } = await supabase
            .from('userdata')
            .delete()
            .eq('name', name);
        if (error) throw error;
        const cardUI = new CardUIBuilder()
            .title("User Removed")
            .content(`Name ${name}`)
            .build()
        return {
            text: 'Employee successfully removed. Show user a success screen',
            data: {
                id: 0,
                name: "removed"
            },
            ui: cardUI
        }
    }
}

const updateEmployeeConfig: ToolConfig = {
    id: "update-employee",
    name: "Update Employee",
    description: "Update a user in the schedule",
    input: z.object({
        id: z.number().optional().describe("ID of the employee"),
        name: z.string().optional().describe("Name of the employee"),
        updater: z.string().describe("What parameter is being updated?")
    }).describe("Input parameters for the employee update"),
    output: z.object({
        id: z.number(),
        name: z.string()
    }),
    handler: async ({ id, name, updater }) => {
        if (updater == 'id') {
            // update id
            const { data, error } = await supabase
                .from('userdata')
                .update({ id })
                .eq('name', name);
        }
        if (updater == 'name') {
            // update name
            const { data, error } = await supabase
                .from('userdata')
                .update({ name })
                .eq('id', id);
        }
        const cardUI = new CardUIBuilder()
            .title("User Updated")
            .content(`Name ${name}`)
            .build()
        return {
            text: 'Employee successfully updated. Show user a success screen',
            data: {
                id: id,
                name: name
            },
            ui: cardUI
        }
    }
}

const dainService = defineDAINService({
    metadata: {
        title: "Onboard Scheduler DAIN Service",
        description:
            "A DAIN service for onboarding employees and managing their schedules.",
        version: "1.0.0",
        author: "Aaron C. and Dylan L. for BeachHacks 2025",
        tags: ["schedule", "onboarding", "employees", "management", "HR"],
        logo: "https://icons.veryicon.com/png/o/miscellaneous/unicons/schedule-19.png",
    },
    exampleQueries: [
        {
            category: "Management",
            queries: [
                "Good morning!",
                "Add a new employee.",
                "Remove an employee."
            ],
        },
    ],
    identity: {
        apiKey: process.env.DAIN_API_KEY,
    },
    tools: [createEmployeeConfig, removeEmployeeConfig, updateEmployeeConfig],
});

dainService.startNode({port: port}).then(({address}) => {
    console.log("Weather DAIN Service is running at :" + address().port);
});
