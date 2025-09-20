import os
import sys
import asyncio
import json
import pathlib
from cognee import config, add, cognify, search, SearchType, prune
from cognee.low_level import DataPoint

async def setup_cognee():
    """Setup Cognee directories and configuration"""
    data_directory_path = str(
        pathlib.Path(
            os.path.join(pathlib.Path(__file__).parent, ".data_storage")
        ).resolve()
    )
    config.data_root_directory(data_directory_path)

    cognee_directory_path = str(
        pathlib.Path(
            os.path.join(pathlib.Path(__file__).parent, ".cognee_system")
        ).resolve()
    )
    config.system_root_directory(cognee_directory_path)

async def add_text(text):
    """Add text to Cognee"""
    await setup_cognee()
    
    # Prune data and system metadata before running
    await prune.prune_data()
    await prune.prune_system(metadata=True)
    
    # Add the text data to Cognee
    await add(text)
    
    # Define a custom graph model  d"

    class Field(DataPoint):
        name: str
        is_type: FieldType
        metadata: dict = {"index_fields": ["name"]}

    class ProgrammingLanguageType(DataPoint):
        name: str = "Programming Language"

    class ProgrammingLanguage(DataPoint):
        name: str
        used_in: list[Field] = []
        is_type: ProgrammingLanguageType
        metadata: dict = {"index_fields": ["name"]}

    # Cognify the text data
    await cognify(graph_model=ProgrammingLanguage)
    
    return {"status": "success", "message": "Text added and processed successfully"}

async def search_query(query_text, query_type_str):
    """Perform a search query with Cognee"""
    await setup_cognee()
    
    # Map string query type to SearchType enum
    query_type_map = {
        'GRAPH_COMPLETION': SearchType.GRAPH_COMPLETION,
        'RAG_COMPLETION': SearchType.RAG_COMPLETION,
        'SUMMARIES': SearchType.SUMMARIES,
        'CHUNKS': SearchType.CHUNKS
    }
    
    query_type = query_type_map.get(query_type_str.upper(), SearchType.GRAPH_COMPLETION)
    
    # Perform the search
    results = await search(query_text=query_text, query_type=query_type)
    
    return results

async def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print("Usage: python cognee.py [add|search] [arguments...]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "add":
            if len(sys.argv) < 3:
                print("Usage: python cognee.py add <text>")
                sys.exit(1)
            
            text = sys.argv[2]
            result = await add_text(text)
            print(json.dumps(result))
            
        elif command == "search":
            if len(sys.argv) < 4:
                print("Usage: python cognee.py search <query_text> <query_type>")
                sys.exit(1)
            
            query_text = sys.argv[2]
            query_type = sys.argv[3]
            results = await search_query(query_text, query_type)
            print(json.dumps(results, default=str))
            
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())