//File: example/example-node.ts

import {z} from "zod";
// import { zodToJsonSchema } from "@zod/json-schema";
import {defineDAINService, ToolConfig} from "@dainprotocol/service-sdk";
import {
    ChartUIBuilder,
    CardUIBuilder,
    TableUIBuilder,
    LayoutUIBuilder, DainResponse, FormUIBuilder,
} from "@dainprotocol/utils";
import {createClient} from '@supabase/supabase-js'
import {GoogleGenerativeAI} from "@google/generative-ai";

const supabaseUrl = 'https://gmepwebfralzzpsmazcg.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const port = Number(process.env.PORT) || 2022;

const createEmployeeConfig: ToolConfig = {
    id: "create-employee",
    name: "Create Employee",
    description: "Create a user in the employee schedule",
    input: z.object({
        id: z.number().optional().describe("ID of the employee"),
        name: z.string().describe("Name of the employee"),
        availability: z.string().optional().describe("Availability of the employee")
    }).describe("Input parameters for the employee creation"),
    output: z.object({
        id: z.number(),
        name: z.string(),
        availability: z.string()
    }),
    handler: async ({id, name, availability}) => {
        // gemini api call
        if (availability != undefined) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
            const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});
            const prompt = `Convert the following text to a stringify string that resembles json as the keys as days 
        with Sunday 0-index, and its values be a list of floats from a 24 hour clock as [start, end]. Include the empty days 
        and do not include code or code blocking. "${availability}"`;
            const result = await model.generateContent(prompt);
            const rawText = result.response.text();
            availability = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else {
            availability = "None";
        }
        // supabase api call
        const {data, error} = await supabase
            .from('userdata')
            .insert({id, name, availability})
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
                name: data.name,
                availability: data.availability
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
    handler: async ({name, id}) => {
        const {data, error} = await supabase
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
        availability: z.string().optional().describe("Availability of the employee"),
        updater: z.string().describe("What parameter is being updated?")
    }).describe("Input parameters for the employee update"),
    output: z.object({
        success: z.boolean()
    }),
    handler: async ({id, name, availability, updater}) => {
        // gemini api call
        if (updater == 'availability') {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
            const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});
            const prompt = `Convert the following text to a stringify string that resembles json as the keys as days 
        with Sunday 0-index, and its values be a list of floats from a 24 hour clock as [start, end]. Include the empty days 
        and do not include code or code blocking. "${availability}"`;
            const result = await model.generateContent(prompt);
            const rawText = result.response.text();
            availability = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        if (updater == 'id') {
            // update id
            const {data, error} = await supabase
                .from('userdata')
                .update({id})
                .eq('name', name);
        }
        if (updater == 'name') {
            // update name
            const {data, error} = await supabase
                .from('userdata')
                .update({name})
                .eq('id', id);
        }
        if (updater == 'availability') {
            // update availability
            const {data, error} = await supabase
                .from('userdata')
                .update({availability})
                .eq('name', name);
        }
        const cardUI = new CardUIBuilder()
            .title("User Updated")
            .content(`Name ${name}`)
            .build()
        return {
            text: 'Employee successfully updated. Show user a success screen',
            data: {
                success: true // assume true for testing
            },
            ui: cardUI
        }
    }
}

const viewEmployeeConfig: ToolConfig = {
    id: "view-employee-userbase",
    name: "View Employees",
    description: "View all employees in the roster. Show a table of the availability of each employee.",
    input: z.object({}),
    output: z.object({
        database: z.any()
    }),
    handler: async ({}) => {
        const {data, error} = await supabase
            .from('userdata')
            .select()
        if (error) throw error;
        const tableUI = new TableUIBuilder()
            .addColumns([
                {key: "id", header: "ID", type: "number"},
                {key: "name", header: "Name", type: "text"},
                {key: "availability", header: "Availability", type: "text"}
            ])
            .rows(data.map(data => ({
                id: data.id,
                name: data.name,
                availability: data.availability
            })))
            .build();
        return {
            text: 'Employee roster displayed',
            data: {
                database: data
            },
            ui: tableUI
        }
    }
}

const createNewSchedule: ToolConfig = {
    id: "create-new-schedule",
    name: "Create New Schedule",
    description: "Create a new schedule for the employees.",
    input: z.object({
        day: z.string().describe("Day of the week")
    }),
    output: z.object({
        database: z.any()
    }),
    handler: async ({}) => {
        // get the database
        const {data, error} = await supabase
            .from('userdata')
            .select()
        if (error) throw error;
        // form ui
        const formUI = new FormUIBuilder()
            .title("Create New Schedule")
            .description("Create a new schedule for the employees.")
            .setRenderMode('page')
            .addFields([
                {
                    name: "start",
                    label: "Start Time",
                    type: "string",
                    widget: "text",
                    required: true
                },
                {
                    name: "end",
                    label: "End Time",
                    type: "string",
                    widget: "text",
                    required: true
                }
            ])
            .onSubmit({
                tool: "display-graph-availability"
            })
            .build();
        return {
            text: 'Do not output anything. Wait for the form submission, then generate a schedule.',
            data: {},
            ui: formUI
        }
    }
}

const generateSchedule: ToolConfig = {
    id: "generate-schedule",
    name: "Generate Schedule",
    description: "Generate a schedule for the employees.",
    input: z.object({
        start: z.string().describe("Start time"),
        end: z.string().describe("End time")
    }),
    output: z.object({
        schedule: z.any()
    }),
    handler: async ({}) => {
        // get the database
        const {data, error} = await supabase
            .from('userdata')
            .select()
        if (error) throw error;
        // const tableUI = new TableUIBuilder()
        //     .addColumns([
        //         {key: "name", header: "Name", type: "text"},
        //         {key: "availability", header: "Availability", type: "text"}
        //     ])
        //     .rows(schedule)
        //     .build();
        const cardUI = new CardUIBuilder()
            .title("Schedule Generated")
            .content(`Schedule generated for FIXME employees`)
            .build
        return {
            text: 'Generate schedule for the employees based on the availability.',
            data: {
                schedule: data
            },
            ui: cardUI
        }
    }
}

const displayGraphAvailability: ToolConfig = {
    id: "display-graph-availability",
    name: "Display Graph Availability",
    description: "Display a graph of everyone's availability",
    input: z.object({}),
    output: z.object({}),
    handler: async ({}) => {
        return {
            text: 'Now generate-schedule using the day and availabilities.',
            data: {},
            ui: new ChartUIBuilder()
                .type('bar')
                .title('Employee Availability')
                .setRenderMode('page')
                .chartData([
                        //will connect to supabase when json converting method is merged
                        {hour: "00:00", employees: 1},
                        {hour: "01:00", employees: 1},
                        {hour: "02:00", employees: 2},
                        {hour: "03:00", employees: 2},
                        {hour: "04:00", employees: 3}
                    ]
                )
                .dataKeys({
                    x: "hour",
                    y: "employees"
                })
                .description("Employee availability displayed for 3/22")
                .build()
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
    tools: [createEmployeeConfig, removeEmployeeConfig, updateEmployeeConfig, viewEmployeeConfig, displayGraphAvailability, createNewSchedule, generateSchedule],
});

dainService.startNode({port: port}).then(({address}) => {
    console.log("Weather DAIN Service is running at :" + address().port);
});
