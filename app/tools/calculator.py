import math
from google.genai import types


async def run_calculator(expression: str) -> str:
    try:
        result = eval(expression, {"__builtins__": {}, "math": math})
        return str(result)
    except Exception as e:
        return f"Error evaluating expression: {e}"


CALCULATOR_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="calculator",
            description="Evaluate a mathematical expression",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "expression": types.Schema(type=types.Type.STRING),
                },
                required=["expression"],
            ),
        )
    ]
)
